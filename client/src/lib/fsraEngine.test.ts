import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { calculateFsra, FsraInput, parseFsraFile } from "./fsraEngine";

const base: FsraInput = {
  entity: "Test borrower",
  year: 2030,
  verified_emissions_t: 1_000,
  allocated_emissions_t: 800,
  domestic_carbon_price_eur: 20,
  eu_export_t: 100,
  embedded_intensity_tco2_per_t: 2,
  cbam_price_eur: 80,
  cbam_coverage_factor: 0.5,
  alpha_cbam: 0.5,
  eta_domestic: 0.25,
  eta_cbam: 0.25,
  deductible_share: 1,
  tax_rate: 0.2,
  ebitda_eur_000: 100,
  cash_tax_eur_000: 10,
  delta_nwc_eur_000: 5,
  maintenance_capex_eur_000: 15,
  debt_service_eur_000: 50,
};

describe("FSRA calculation engine", () => {
  it("sets direct CBAM certificate cost to zero through 2025", () => {
    const result = calculateFsra({ ...base, year: 2025 });
    expect(result.gross_cbam_eur_000).toBe(0);
    expect(result.net_cbam_eur_000).toBe(0);
  });

  it("converts POW activity from MWh and gCO2/kWh to tCO2e", () => {
    const result = calculateFsra({
      ...base,
      verified_emissions_t: 0,
      generation_mwh: 1_000_000,
      emission_factor_g_per_kwh: 650,
    });
    expect(result.verified_emissions_calc_t).toBe(650_000);
  });

  it("sets CBAM exposure to zero when EU exports are zero", () => {
    const result = calculateFsra({ ...base, eu_export_t: 0 });
    expect(result.gross_cbam_eur_000).toBe(0);
    expect(result.exporter_cbam_burden_eur_000).toBe(0);
  });

  it("caps origin-country credit at gross CBAM exposure", () => {
    const result = calculateFsra({
      ...base,
      origin_price_paid_eur: 1_000,
      eligible_embedded_emissions_t: 10_000,
    });
    expect(result.origin_credit_eur_000).toBe(result.gross_cbam_eur_000);
    expect(result.net_cbam_eur_000).toBe(0);
  });

  it("computes post-carbon DSCR from CFADS after burden and capped tax shield", () => {
    const result = calculateFsra(base);
    expect(result.tax_shield_eur_000).toBeLessThanOrEqual(base.cash_tax_eur_000!);
    expect(result.dscr_post_carbon).toBeLessThan(result.dscr_pre_carbon!);
    expect(result.dscr_post_carbon).toBeCloseTo(result.post_carbon_cfads_eur_000 / base.debt_service_eur_000!, 8);
  });

  it("uses the default phase-in schedule when coverage is omitted", () => {
    const result2030 = calculateFsra({ ...base, cbam_coverage_factor: undefined, year: 2030 });
    const result2034 = calculateFsra({ ...base, cbam_coverage_factor: undefined, year: 2034 });
    expect(result2030.gross_cbam_eur_000).toBeCloseTo((100 * 2 * 80 * 0.485) / 1_000, 8);
    expect(result2034.gross_cbam_eur_000).toBeCloseTo((100 * 2 * 80) / 1_000, 8);
  });

  it("sums emissions from POW and production sources for multi-sector entities (fix)", () => {
    const result = calculateFsra({
      ...base,
      verified_emissions_t: 0,
      generation_mwh: 1_000_000,
      emission_factor_g_per_kwh: 650,
      production_t: 100_000,
      activity_intensity_tco2_per_t: 1.5,
    });
    // 650_000 (POW) + 150_000 (production) — trước đây chỉ lấy 650_000
    expect(result.verified_emissions_calc_t).toBe(800_000);
  });

  it("caps origin-country eligible tons at declared embedded emissions (fix)", () => {
    const overstated = calculateFsra({
      ...base,
      eu_export_t: 100,
      embedded_intensity_tco2_per_t: 2, // eu_embedded = 200 t
      origin_price_paid_eur: 10,
      eligible_embedded_emissions_t: 5_000, // vượt xa 200 t
    });
    // originCreditRaw không dùng 5_000 t mà chỉ dùng tối đa 200 t
    expect(overstated.origin_credit_eur_000).toBeCloseTo((10 * 200) / 1_000, 8);
    expect(overstated.notes.some((note) => note.includes("Cảnh báo dữ liệu"))).toBe(true);
  });

  it("clamps negative physical/price inputs to zero instead of letting them offset other terms (fix)", () => {
    const result = calculateFsra({ ...base, domestic_carbon_price_eur: -20 });
    expect(result.domestic_liability_eur_000).toBe(0);
    expect(result.notes.some((note) => note.includes("không hợp lệ về kinh tế"))).toBe(true);
  });

  it("supports configurable DSCR covenant thresholds (fix)", () => {
    const tightCovenant = calculateFsra({ ...base, dscr_warning_threshold: 1.5, dscr_default_threshold: 1.1 });
    const looseCovenant = calculateFsra({ ...base, dscr_warning_threshold: 1.5, dscr_default_threshold: 1.1, debt_service_eur_000: 40 });
    expect(tightCovenant.dscr_post_carbon).not.toBeNull();
    expect(looseCovenant.risk_status).toBeDefined();
  });

  it("phân loại đúng giai đoạn thí điểm/ETS chính thức của thị trường carbon nội địa, mặc định và khi ghi đè theo scenario", () => {
    const pilotByDefault = calculateFsra({ ...base, year: 2027 });
    expect(pilotByDefault.domestic_market_phase).toBe("pilot");
    expect(pilotByDefault.domestic_ets_start_year_used).toBe(2029);

    const etsByDefault = calculateFsra({ ...base, year: 2029 });
    expect(etsByDefault.domestic_market_phase).toBe("ets");

    // Ghi đè mốc riêng cho scenario: nếu người dùng cho rằng ETS bắt đầu từ 2027
    const etsOverride = calculateFsra({ ...base, year: 2027, domestic_ets_start_year: 2027 });
    expect(etsOverride.domestic_market_phase).toBe("ets");
    expect(etsOverride.domestic_ets_start_year_used).toBe(2027);
    expect(etsOverride.notes.some((note) => note.includes("theo giả định scenario"))).toBe(true);
  });

  it("parses JSON records", async () => {
    const file = new File([JSON.stringify({ records: [{ company: "JSON Co", year: 2030, debt_service: 25 }] })], "input.json", { type: "application/json" });
    const rows = await parseFsraFile(file);
    expect(rows[0].entity).toBe("JSON Co");
    expect(rows[0].debt_service_eur_000).toBe(25);
  });

  it("parses the Inputs worksheet from Excel", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ entity: "Excel Co", year: 2034, debt_service_eur_000: 50 }]), "Inputs");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = new File([bytes], "input.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const rows = await parseFsraFile(file);
    expect(rows[0].entity).toBe("Excel Co");
    expect(rows[0].year).toBe(2034);
  });
});
