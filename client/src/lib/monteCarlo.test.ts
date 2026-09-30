import { describe, expect, it } from "vitest";
import { FsraInput } from "./fsraEngine";
import { DEFAULT_SIMULATION, runMonteCarlo, runSensitivityMatrix } from "./monteCarlo";

const borrower: FsraInput = {
  entity: "NKG test proxy",
  year: 2034,
  verified_emissions_t: 1_400_000,
  allocated_emissions_t: 1_100_000,
  domestic_carbon_price_eur: 35,
  eu_export_t: 150_000,
  embedded_intensity_tco2_per_t: 1.8,
  cbam_price_eur: 92,
  cbam_coverage_factor: 1,
  alpha_cbam: 0.5,
  eta_domestic: 0.25,
  eta_cbam: 0.35,
  deductible_share: 0.5,
  tax_rate: 0.2,
  ebitda_eur_000: 86_000,
  cash_tax_eur_000: 8_000,
  delta_nwc_eur_000: 3_500,
  maintenance_capex_eur_000: 17_000,
  debt_service_eur_000: 42_000,
};

const config = { ...DEFAULT_SIMULATION, paths: 1_000, seed: 77 };

describe("Monte Carlo and sensitivity engine", () => {
  it("is reproducible with the same random seed", () => {
    const first = runMonteCarlo(borrower, config);
    const second = runMonteCarlo(borrower, config);
    expect(second.p5).toBe(first.p5);
    expect(second.p50).toBe(first.p50);
    expect(second.probabilityBreach).toBe(first.probabilityBreach);
  });

  it("returns ordered quantiles and bounded probabilities", () => {
    const result = runMonteCarlo(borrower, config);
    expect(result.p5!).toBeLessThanOrEqual(result.p50!);
    expect(result.p50!).toBeLessThanOrEqual(result.p95!);
    expect(result.probabilityBreach).toBeGreaterThanOrEqual(0);
    expect(result.probabilityBreach).toBeLessThanOrEqual(1);
    expect(result.probabilityDefaultIndicator).toBeLessThanOrEqual(result.probabilityBreach);
  });

  it("increases downside risk when the exporter bears more CBAM cost", () => {
    const lowBurden = runMonteCarlo({ ...borrower, alpha_cbam: 0 }, config);
    const fullBurden = runMonteCarlo({ ...borrower, alpha_cbam: 1 }, config);
    expect(fullBurden.p5!).toBeLessThanOrEqual(lowBurden.p5!);
    expect(fullBurden.probabilityBreach).toBeGreaterThanOrEqual(lowBurden.probabilityBreach);
  });

  it("returns both CBAM and domestic matrices for dual-shock exporters", () => {
    // FIX (audit): borrower có cả eu_export_t>0 VÀ domestic_carbon_price_eur>0
    // (dual-shock) phải nhận đủ 2 ma trận, không chỉ 1.
    const matrices = runSensitivityMatrix(borrower, config);
    expect(matrices.map((m) => m.mode).sort()).toEqual(["cbam", "domestic"]);
  });

  it("returns only the domestic matrix when there is no EU export exposure", () => {
    const matrices = runSensitivityMatrix({ ...borrower, eu_export_t: 0 }, config);
    expect(matrices).toHaveLength(1);
    expect(matrices[0].mode).toBe("domestic");
  });

  it("returns only the CBAM matrix when there is no domestic carbon price exposure", () => {
    const matrices = runSensitivityMatrix({ ...borrower, domestic_carbon_price_eur: 0 }, config);
    expect(matrices).toHaveLength(1);
    expect(matrices[0].mode).toBe("cbam");
  });
});
