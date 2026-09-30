/**
 * Climate Risk Lab simulation engine: deterministic seed, common random numbers,
 * explicit carbon-price shocks, and credit-language guardrails.
 */
import { calculateFsra, FsraInput } from "./fsraEngine";

export type SimulationConfig = {
  paths: number;
  seed: number;
  domesticVol: number;
  cbamVol: number;
  correlation: number;
};

export type HistogramBin = {
  range: string;
  midpoint: number;
  count: number;
  share: number;
};

export type SimulationResult = {
  p5: number | null;
  p50: number | null;
  p95: number | null;
  probabilityBreach: number;
  probabilityDefaultIndicator: number;
  expectedCarbonBurden: number;
  carbonVar95: number;
  histogram: HistogramBin[];
  validPaths: number;
};

export type SensitivityMatrix = {
  mode: "cbam" | "domestic";
  title: string;
  rowLabel: string;
  columnLabel: string;
  rows: number[];
  columns: number[];
  values: number[][];
};

export const DEFAULT_SIMULATION: SimulationConfig = {
  paths: 5_000,
  seed: 2026,
  domesticVol: 0.25,
  cbamVol: 0.2,
  correlation: 0.55,
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function normalPair(random: () => number) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const radius = Math.sqrt(-2 * Math.log(u1));
  return [radius * Math.cos(2 * Math.PI * u2), radius * Math.sin(2 * Math.PI * u2)] as const;
}

function quantile(sorted: number[], probability: number) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function histogram(values: number[], bins = 14): HistogramBin[] {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const lower = quantile(sorted, 0.01) ?? sorted[0];
  const upperRaw = quantile(sorted, 0.99) ?? sorted.at(-1)!;
  const upper = upperRaw <= lower ? lower + 0.01 : upperRaw;
  const width = (upper - lower) / bins;
  const counts = Array.from({ length: bins }, () => 0);

  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.max(0, Math.floor((value - lower) / width)));
    counts[index] += 1;
  });

  return counts.map((count, index) => {
    const start = lower + index * width;
    const end = start + width;
    return {
      range: `${start.toFixed(2)}–${end.toFixed(2)}`,
      midpoint: start + width / 2,
      count,
      share: count / values.length,
    };
  });
}

export function runMonteCarlo(input: FsraInput, config: SimulationConfig): SimulationResult {
  const paths = Math.max(250, Math.min(25_000, Math.trunc(config.paths)));
  const random = mulberry32(Math.trunc(config.seed));
  const rho = Math.max(-0.99, Math.min(0.99, config.correlation));
  const rhoResidual = Math.sqrt(1 - rho ** 2);
  const domesticVol = Math.max(0, Math.min(1.5, config.domesticVol));
  const cbamVol = Math.max(0, Math.min(1.5, config.cbamVol));
  const dscrValues: number[] = [];
  const carbonValues: number[] = [];

  for (let path = 0; path < paths; path += 1) {
    const [z1, z2Independent] = normalPair(random);
    const z2 = rho * z1 + rhoResidual * z2Independent;
    const domesticMultiplier = Math.exp(-0.5 * domesticVol ** 2 + domesticVol * z1);
    const cbamMultiplier = Math.exp(-0.5 * cbamVol ** 2 + cbamVol * z2);
    const result = calculateFsra({
      ...input,
      domestic_carbon_price_eur: (input.domestic_carbon_price_eur ?? 0) * domesticMultiplier,
      cbam_price_eur: (input.cbam_price_eur ?? 0) * cbamMultiplier,
    });
    if (result.dscr_post_carbon !== null && Number.isFinite(result.dscr_post_carbon)) {
      dscrValues.push(result.dscr_post_carbon);
      carbonValues.push(result.carbon_cash_burden_eur_000);
    }
  }

  const dscrSorted = [...dscrValues].sort((a, b) => a - b);
  const carbonSorted = [...carbonValues].sort((a, b) => a - b);
  const valid = dscrValues.length || 1;

  return {
    p5: quantile(dscrSorted, 0.05),
    p50: quantile(dscrSorted, 0.5),
    p95: quantile(dscrSorted, 0.95),
    probabilityBreach: dscrValues.filter((value) => value < 1.2).length / valid,
    probabilityDefaultIndicator: dscrValues.filter((value) => value < 1).length / valid,
    expectedCarbonBurden: carbonValues.reduce((sum, value) => sum + value, 0) / valid,
    carbonVar95: quantile(carbonSorted, 0.95) ?? 0,
    histogram: histogram(dscrValues),
    validPaths: dscrValues.length,
  };
}

function buildCbamMatrix(input: FsraInput, reducedConfig: SimulationConfig): SensitivityMatrix {
  const rows = [0, 0.25, 0.5, 0.75, 1];
  const columns = [0, 0.25, 0.5, 0.75, 1];
  return {
    mode: "cbam",
    title: "αCBAM × ηCBAM",
    rowLabel: "Exporter burden α",
    columnLabel: "Pass-through η",
    rows,
    columns,
    values: rows.map((alpha) => columns.map((eta) => runMonteCarlo({ ...input, alpha_cbam: alpha, eta_cbam: eta }, reducedConfig).probabilityBreach)),
  };
}

function buildDomesticMatrix(input: FsraInput, reducedConfig: SimulationConfig): SensitivityMatrix {
  const rows = [0, 0.05, 0.1, 0.15, 0.2];
  const columns = [0, 0.25, 0.5, 0.75, 1];
  return {
    mode: "domestic",
    title: "Allocation tightening × ηDomestic",
    rowLabel: "Allocation tightening",
    columnLabel: "Pass-through η",
    rows,
    columns,
    values: rows.map((tightening) => columns.map((eta) => runMonteCarlo({ ...input, allocation_tightening: tightening, eta_domestic: eta }, reducedConfig).probabilityBreach)),
  };
}

/**
 * FIX (audit): trước đây hàm này chỉ trả về MỘT ma trận — nếu entity có CBAM exposure
 * (eu_export_t > 0 và embedded_intensity > 0) thì chỉ hiện trục CBAM (α × η) và hoàn toàn
 * bỏ qua trục domestic (allocation tightening × η domestic), dù runMonteCarlo() vẫn sốc
 * đồng thời cả hai trục cho các entity "dual-shock". Điều này khiến risk officer đánh giá
 * thấp độ nhạy phía nội địa của các entity vừa xuất khẩu EU vừa chịu carbon price nội địa
 * (ví dụ NKG proxy trong sampleInputs). Nay trả về MẢNG ma trận: entity dual-shock (có cả
 * exposure CBAM lẫn domestic_carbon_price > 0) nhận đủ 2 ma trận; entity đơn-shock chỉ
 * nhận 1 ma trận tương ứng.
 */
export function runSensitivityMatrix(input: FsraInput, config: SimulationConfig): SensitivityMatrix[] {
  const reducedConfig = { ...config, paths: Math.min(config.paths, 1_500) };
  const hasCbam = (input.eu_export_t ?? 0) > 0 && (input.embedded_intensity_tco2_per_t ?? 0) > 0;
  const hasDomestic = (input.domestic_carbon_price_eur ?? 0) > 0 && (input.allocated_emissions_t ?? 0) >= 0;

  const matrices: SensitivityMatrix[] = [];
  if (hasCbam) matrices.push(buildCbamMatrix(input, reducedConfig));
  if (hasDomestic || !hasCbam) matrices.push(buildDomesticMatrix(input, reducedConfig));
  return matrices;
}
