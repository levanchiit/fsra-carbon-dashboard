import * as XLSX from "xlsx";

export type RawRecord = Record<string, unknown>;

export type FsraInput = {
  entity: string;
  year: number;
  exposure_type?: string;
  production_t?: number;
  activity_intensity_tco2_per_t?: number;
  generation_mwh?: number;
  emission_factor_g_per_kwh?: number;
  verified_emissions_t?: number;
  allocated_emissions_t?: number;
  allocation_tightening?: number;
  domestic_carbon_price_eur?: number;
  domestic_pilot_end_year?: number;
  domestic_ets_start_year?: number;
  domestic_market_regime?: "pilot" | "ets" | "auto";
  eu_export_t?: number;
  embedded_intensity_tco2_per_t?: number;
  cbam_price_eur?: number;
  cbam_coverage_factor?: number;
  origin_price_paid_eur?: number;
  eligible_embedded_emissions_t?: number;
  alpha_cbam?: number;
  eta_domestic?: number;
  eta_cbam?: number;
  deductible_share?: number;
  tax_rate?: number;
  ebitda_eur_000?: number;
  cash_tax_eur_000?: number;
  delta_nwc_eur_000?: number;
  maintenance_capex_eur_000?: number;
  debt_service_eur_000?: number;
  dscr_warning_threshold?: number;
  dscr_default_threshold?: number;
};

export type FsraResult = FsraInput & {
  verified_emissions_calc_t: number;
  adjusted_allocation_t: number;
  carbon_deficit_t: number;
  domestic_liability_eur_000: number;
  domestic_market_phase: "pilot" | "ets";
  domestic_ets_start_year_used: number;
  eu_embedded_emissions_t: number;
  cbam_coverage_used: number;
  gross_cbam_eur_000: number;
  origin_credit_eur_000: number;
  net_cbam_eur_000: number;
  domestic_cash_burden_eur_000: number;
  exporter_cbam_burden_eur_000: number;
  carbon_cash_burden_eur_000: number;
  tax_shield_eur_000: number;
  base_cfads_eur_000: number;
  post_carbon_cfads_eur_000: number;
  dscr_pre_carbon: number | null;
  dscr_post_carbon: number | null;
  risk_status: "Đạt covenant" | "Cảnh báo covenant" | "Stress dòng tiền" | "Thiếu dữ liệu";
  notes: string[];
};

export const REQUIRED_CORE = ["entity", "year", "debt_service_eur_000"] as const;

export const FIELD_DEFINITIONS = [
  ["entity", "Tên doanh nghiệp/archetype", "text"],
  ["year", "Năm phân tích", "YYYY"],
  ["exposure_type", "Loại exposure (mô tả, không dùng để tính)", "text"],
  ["verified_emissions_t", "Phát thải đã xác minh; có thể thay bằng dữ liệu hoạt động", "tCO₂e"],
  ["generation_mwh", "Sản lượng điện dành cho POW", "MWh"],
  ["emission_factor_g_per_kwh", "Cường độ phát thải điện", "gCO₂/kWh"],
  ["production_t", "Sản lượng sản phẩm", "tấn"],
  ["activity_intensity_tco2_per_t", "Cường độ phát thải sản xuất", "tCO₂e/tấn"],
  ["allocated_emissions_t", "Hạn ngạch được phân bổ", "tCO₂e"],
  ["allocation_tightening", "Tỷ lệ siết hạn ngạch nội địa", "%"],
  ["domestic_carbon_price_eur", "Giá carbon nội địa", "EUR/tCO₂e"],
  ["domestic_market_regime", "Chế độ thị trường: pilot / ets / auto (để trống = auto theo năm)", "pilot|ets|auto"],
  ["domestic_pilot_end_year", "Năm kết thúc thí điểm (mặc định 2028 theo QĐ232)", "YYYY"],
  ["domestic_ets_start_year", "Năm ETS chính thức bắt đầu (mặc định 2029 theo QĐ232)", "YYYY"],
  ["eu_export_t", "Sản lượng hàng thuộc phạm vi xuất EU", "tấn"],
  ["embedded_intensity_tco2_per_t", "Phát thải nhúng hàng EU", "tCO₂e/tấn"],
  ["cbam_price_eur", "Giá chứng chỉ CBAM", "EUR/tCO₂e"],
  ["cbam_coverage_factor", "Tỷ lệ phase-in, nhập 0–1 hoặc 0–100 (để trống = lịch mặc định theo năm)", "%"],
  ["alpha_cbam", "Tỷ lệ CBAM exporter thực sự gánh", "%"],
  ["eta_domestic", "Domestic pass-through", "%"],
  ["eta_cbam", "CBAM pass-through", "%"],
  ["origin_price_paid_eur", "Giá carbon đã trả tại nước xuất xứ (Điều 9 CBAM)", "EUR/tCO₂e"],
  ["eligible_embedded_emissions_t", "Tấn phát thải nhúng đủ điều kiện khấu trừ", "tCO₂e"],
  ["deductible_share", "Tỷ lệ carbon burden được khấu trừ thuế", "%"],
  ["tax_rate", "Thuế suất TNDN", "%"],
  ["ebitda_eur_000", "EBITDA", "EUR '000"],
  ["cash_tax_eur_000", "Cash tax trước carbon", "EUR '000"],
  ["delta_nwc_eur_000", "Biến động vốn lưu động", "EUR '000"],
  ["maintenance_capex_eur_000", "Maintenance CapEx", "EUR '000"],
  ["debt_service_eur_000", "Lãi + gốc đến hạn", "EUR '000"],
  ["dscr_warning_threshold", "Ngưỡng cảnh báo covenant DSCR (mặc định 1.2x)", "x"],
  ["dscr_default_threshold", "Ngưỡng stress/default DSCR (mặc định 1.0x)", "x"],
] as const;

const aliases: Record<string, keyof FsraInput> = {
  company: "entity",
  borrower: "entity",
  doanh_nghiep: "entity",
  nam: "year",
  exposure: "exposure_type",
  verified_emissions: "verified_emissions_t",
  emissions_t: "verified_emissions_t",
  allowance_t: "allocated_emissions_t",
  allocation_t: "allocated_emissions_t",
  domestic_price: "domestic_carbon_price_eur",
  eu_export: "eu_export_t",
  cbam_price: "cbam_price_eur",
  coverage_factor: "cbam_coverage_factor",
  ebitda: "ebitda_eur_000",
  cash_tax: "cash_tax_eur_000",
  delta_nwc: "delta_nwc_eur_000",
  maintenance_capex: "maintenance_capex_eur_000",
  debt_service: "debt_service_eur_000",
};

const numericFields = new Set<keyof FsraInput>([
  "year",
  "production_t",
  "activity_intensity_tco2_per_t",
  "generation_mwh",
  "emission_factor_g_per_kwh",
  "verified_emissions_t",
  "allocated_emissions_t",
  "allocation_tightening",
  "domestic_carbon_price_eur",
  "eu_export_t",
  "embedded_intensity_tco2_per_t",
  "cbam_price_eur",
  "cbam_coverage_factor",
  "origin_price_paid_eur",
  "eligible_embedded_emissions_t",
  "alpha_cbam",
  "eta_domestic",
  "eta_cbam",
  "deductible_share",
  "tax_rate",
  "ebitda_eur_000",
  "cash_tax_eur_000",
  "delta_nwc_eur_000",
  "maintenance_capex_eur_000",
  "debt_service_eur_000",
  "dscr_warning_threshold",
  "dscr_default_threshold",
]);

// Các trường vật lý/giá không thể âm về mặt kinh tế — âm chỉ có thể do lỗi nhập liệu.
// EBITDA, cash_tax, delta_nwc KHÔNG nằm trong danh sách này vì có thể âm hợp lệ
// (DN lỗ, DN được hoàn thuế, hoặc giải phóng vốn lưu động).
const nonNegativeFields = new Set<keyof FsraInput>([
  "production_t",
  "activity_intensity_tco2_per_t",
  "generation_mwh",
  "emission_factor_g_per_kwh",
  "verified_emissions_t",
  "allocated_emissions_t",
  "domestic_carbon_price_eur",
  "eu_export_t",
  "embedded_intensity_tco2_per_t",
  "cbam_price_eur",
  "origin_price_paid_eur",
  "eligible_embedded_emissions_t",
  "maintenance_capex_eur_000",
  "debt_service_eur_000",
]);

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/\s/g, "").replace(/%/g, "").replace(/,/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function defaultCbamCoverage(year: number) {
  const schedule: Record<number, number> = {
    2026: 0.025,
    2027: 0.05,
    2028: 0.1,
    2029: 0.225,
    2030: 0.485,
    2031: 0.61,
    2032: 0.735,
    2033: 0.86,
  };
  if (year <= 2025) return 0;
  if (year >= 2034) return 1;
  return schedule[year] ?? 0;
}

/**
 * MỐC MẶC ĐỊNH cho giai đoạn thí điểm → ETS chính thức của thị trường carbon VN.
 * Nguồn: Quyết định 232/QĐ-TTg (24/1/2025) + Nghị định 119/2025/NĐ-CP (8/2025):
 * thí điểm 6/2025 – hết 2028 (hạn ngạch miễn phí, chưa đấu giá), ETS chính thức
 * (đấu giá) từ 2029. Đây là điểm neo mặc định của HỆ THỐNG — luôn ghi đè được theo
 * từng scenario qua domestic_pilot_end_year / domestic_ets_start_year nếu người
 * dùng có căn cứ khác (VD dự thảo mới, thông tin nội bộ). Đặt thành hằng số duy nhất
 * để không lặp lại "2029" rải rác trong code — đổi ở một chỗ khi có văn bản mới.
 */
export const DEFAULT_DOMESTIC_PILOT_END_YEAR = 2028;
export const DEFAULT_DOMESTIC_ETS_START_YEAR = 2029;

/**
 * Xác định giai đoạn của thị trường carbon nội địa VN cho một năm cụ thể:
 * "pilot" (thí điểm) hay "ets" (vận hành chính thức, bắt buộc).
 *
 * LƯU Ý QUAN TRỌNG: khác với lịch phase-in CBAM (đã được EU công bố % cụ thể theo
 * từng năm, verify được), Việt Nam CHƯA công bố cơ chế chi tiết của ETS chính thức
 * (giá đấu giá, % hạn ngạch miễn phí giảm dần theo năm...). Vì vậy hàm này CHỈ xác
 * định giai đoạn (pilot/ets) để gắn nhãn và cảnh báo — KHÔNG tự suy ra allocation_tightening
 * hay domestic_carbon_price cho giai đoạn ETS. Người dùng phải tự nhập các giá trị
 * này theo văn bản chính thức khi Nghị định ETS được ban hành, hoặc theo giả định
 * scenario riêng của mình qua domestic_market_regime.
 */
export function domesticMarketPhase(input: FsraInput): "pilot" | "ets" {
  if (input.domestic_market_regime === "pilot") return "pilot";
  if (input.domestic_market_regime === "ets") return "ets";
  const etsStart = input.domestic_ets_start_year !== undefined && input.domestic_ets_start_year !== null
    ? asNumber(input.domestic_ets_start_year)
    : DEFAULT_DOMESTIC_ETS_START_YEAR;
  return input.year >= etsStart ? "ets" : "pilot";
}

/** Năm ETS chính thức đã dùng để tính (mặc định hệ thống hoặc ghi đè theo scenario) — expose để audit/export. */
export function resolvedDomesticEtsStartYear(input: FsraInput): number {
  return input.domestic_ets_start_year !== undefined && input.domestic_ets_start_year !== null
    ? asNumber(input.domestic_ets_start_year)
    : DEFAULT_DOMESTIC_ETS_START_YEAR;
}

function asRate(value: unknown, fallback = 0) {
  const number = value === undefined || value === null || value === "" ? fallback : asNumber(value);
  if (number > 1 && number <= 100) return number / 100;
  return Math.min(1, Math.max(0, number));
}

function normalizeRecord(record: RawRecord): FsraInput {
  const normalized: Record<string, unknown> = {};
  Object.entries(record).forEach(([key, value]) => {
    const base = normalizeKey(key);
    const target = aliases[base] ?? base;
    normalized[target] = value;
  });

  const input: Record<string, unknown> = {};
  Object.entries(normalized).forEach(([key, value]) => {
    input[key] = numericFields.has(key as keyof FsraInput) ? asNumber(value) : value;
  });

  return {
    entity: String(input.entity ?? "Chưa đặt tên"),
    year: Math.trunc(asNumber(input.year) || new Date().getFullYear()),
    ...input,
  } as FsraInput;
}

export async function parseFsraFile(file: File): Promise<FsraInput[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "json") {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { records?: unknown[] }).records)
        ? (parsed as { records: unknown[] }).records
        : [parsed];
    return rows.map((row) => normalizeRecord(row as RawRecord));
  }

  if (["xlsx", "xls", "csv"].includes(extension ?? "")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const preferred = workbook.SheetNames.find((name) => normalizeKey(name) === "inputs") ?? workbook.SheetNames[0];
    if (!preferred) throw new Error("Workbook không có worksheet để đọc.");
    const rows = XLSX.utils.sheet_to_json<RawRecord>(workbook.Sheets[preferred], { defval: "" });
    return rows.filter((row) => Object.values(row).some((value) => value !== "")).map(normalizeRecord);
  }

  throw new Error("Định dạng chưa được hỗ trợ. Hãy dùng .xlsx, .xls, .csv hoặc .json.");
}

export function calculateFsra(input: FsraInput): FsraResult {
  const notes: string[] = [];
  const rate = (key: keyof FsraInput, fallback = 0) => asRate(input[key], fallback);
  const n = (key: keyof FsraInput) => {
    const value = asNumber(input[key]);
    // Guard: các trường vật lý/giá không thể âm — clamp về 0 và ghi chú để lộ lỗi nhập liệu
    // thay vì để giá trị âm âm thầm bù trừ các khoản mục khác trong công thức.
    if (nonNegativeFields.has(key) && value < 0) {
      notes.push(`Giá trị âm ở "${key}" (${value}) không hợp lệ về kinh tế — đã chặn về 0.`);
      return 0;
    }
    return value;
  };

  // Lớp đơn vị phát thải: CỘNG DỒN mọi nguồn phát thải suy ra được (POW + sản xuất),
  // thay vì chỉ lấy nguồn khớp điều kiện đầu tiên — tránh bỏ sót phát thải với DN đa ngành
  // (vừa phát điện vừa sản xuất) khi verified_emissions_t không được cung cấp trực tiếp.
  let verified = n("verified_emissions_t");
  if (verified <= 0) {
    let inferred = 0;
    const hasPow = n("generation_mwh") > 0 && n("emission_factor_g_per_kwh") > 0;
    const hasProduction = n("production_t") > 0 && n("activity_intensity_tco2_per_t") > 0;
    if (hasPow) {
      inferred += (n("generation_mwh") * n("emission_factor_g_per_kwh")) / 1_000;
      notes.push("Phát thải POW được suy ra từ MWh × gCO₂/kWh ÷ 1.000.");
    }
    if (hasProduction) {
      inferred += n("production_t") * n("activity_intensity_tco2_per_t");
      notes.push("Phát thải sản xuất được suy ra từ sản lượng × cường độ hoạt động.");
    }
    if (hasPow && hasProduction) {
      notes.push("Đã cộng dồn phát thải từ cả hai nguồn (điện + sản xuất) cho entity đa ngành.");
    }
    if (!hasPow && !hasProduction) {
      notes.push("Thiếu phát thải đã xác minh hoặc dữ liệu hoạt động để suy ra phát thải.");
    }
    verified = inferred;
  }

  const marketPhase = domesticMarketPhase(input);
  const etsStartUsed = resolvedDomesticEtsStartYear(input);
  const adjustedAllocation = n("allocated_emissions_t") * (1 - rate("allocation_tightening"));
  const deficit = Math.max(0, verified - adjustedAllocation);
  const domesticLiability = (deficit * n("domestic_carbon_price_eur")) / 1_000;

  // Cảnh báo chuyển giao thí điểm → ETS chính thức (VN pilot → mandatory ETS,
  // tương tự cơ chế CBAM nhưng chưa có lịch phase-in công bố chính thức cho VN).
  if (marketPhase === "pilot") {
    notes.push(
      `Giai đoạn THÍ ĐIỂM sàn carbon nội địa (đến năm ${etsStartUsed - 1}${input.domestic_ets_start_year === undefined ? " — mặc định hệ thống theo QĐ232/NĐ119" : " — theo giả định scenario"}) — giá và hạn ngạch mang tính chỉ báo, chưa bắt buộc đấu giá.`,
    );
  } else {
    notes.push(
      `Giai đoạn ETS CHÍNH THỨC (từ năm ${etsStartUsed}${input.domestic_ets_start_year === undefined ? " — mặc định hệ thống theo QĐ232/NĐ119" : " — theo giả định scenario"}) — domestic_carbon_price_eur cần phản ánh giá đấu giá/thị trường thực tế, không còn là giá chỉ báo thí điểm.`,
    );
    if (rate("allocation_tightening") <= 0) {
      notes.push(
        "Cảnh báo: đang ở giai đoạn ETS chính thức nhưng allocation_tightening = 0 — kiểm tra lại, vì hạn ngạch miễn phí thường giảm dần khi ETS chính thức vận hành (cơ chế tương tự free-allocation phase-out của CBAM/EU ETS). Việt Nam chưa công bố lộ trình siết hạn ngạch chi tiết; hãy tự cập nhật theo Nghị định chính thức hoặc theo giả định scenario riêng.",
      );
    }
  }

  const euEmbedded = n("eu_export_t") * n("embedded_intensity_tco2_per_t");
  const coverageMissing = input.cbam_coverage_factor === undefined || input.cbam_coverage_factor === null;
  const coverage = input.year <= 2025 ? 0 : coverageMissing ? defaultCbamCoverage(input.year) : rate("cbam_coverage_factor");
  const grossCbam = (euEmbedded * n("cbam_price_eur") * coverage) / 1_000;

  // Điều 9 CBAM: số tấn được khấu trừ giá carbon đã trả ở nước xuất xứ KHÔNG được vượt quá
  // tổng phát thải nhúng đã khai báo cho hàng hóa đó (euEmbedded). Trước đây chỉ chặn ở
  // mức EUR (qua gross_cbam) — điều đó che giấu sai lệch dữ liệu khi eligible_embedded
  // vượt euEmbedded nhưng cbam_price ≠ origin_price (kết quả EUR vẫn có thể khác đúng).
  const eligibleRaw = n("eligible_embedded_emissions_t");
  const eligibleCapped = Math.min(eligibleRaw, euEmbedded);
  if (eligibleRaw > euEmbedded && euEmbedded > 0) {
    notes.push(
      `Cảnh báo dữ liệu: eligible_embedded_emissions_t (${eligibleRaw.toLocaleString()} t) vượt tổng phát thải nhúng khai báo eu_embedded (${euEmbedded.toLocaleString()} t) — đã giới hạn về mức tối đa hợp lệ theo Điều 9 CBAM.`,
    );
  }
  const originCreditRaw = (n("origin_price_paid_eur") * eligibleCapped) / 1_000;
  const originCredit = Math.min(grossCbam, Math.max(0, originCreditRaw));
  const netCbam = Math.max(0, grossCbam - originCredit);

  const domesticBurden = domesticLiability * (1 - rate("eta_domestic"));
  const cbamBurden = netCbam * rate("alpha_cbam", 0.5) * (1 - rate("eta_cbam"));
  const carbonBurden = domesticBurden + cbamBurden;
  const cashTax = n("cash_tax_eur_000");
  const deductible = carbonBurden * rate("deductible_share");
  // GIẢ ĐỊNH: tax shield bị chặn trần bằng cash_tax hiện có (không mô hình hoàn thuế
  // hay chuyển lỗi/NOL carryforward). Đây là cách tiếp cận bảo thủ cho stress-test;
  // nếu carbon burden đẩy thu nhập chịu thuế xuống âm, giá trị tấm chắn thuế thực tế
  // trong các năm sau có thể cao hơn số hiển thị ở đây.
  const taxShield = Math.min(cashTax, deductible * rate("tax_rate"));
  const baseCfads = n("ebitda_eur_000") - cashTax - n("delta_nwc_eur_000") - n("maintenance_capex_eur_000");
  const postCfads = baseCfads - carbonBurden + taxShield;
  const debtService = n("debt_service_eur_000");
  const dscrPre = debtService > 0 ? baseCfads / debtService : null;
  const dscrPost = debtService > 0 ? postCfads / debtService : null;

  // Ngưỡng covenant DSCR có thể cấu hình theo từng khoản vay (mặc định 1.0x / 1.2x
  // là quy ước phổ biến, nhưng điều khoản thực tế trên hợp đồng tín dụng khác nhau).
  // LƯU Ý: đây là hệ số DSCR (thường 0.8x–2x), không phải tỷ lệ % — không dùng asRate()
  // vì asRate() sẽ hiểu nhầm 1.2 là "120%" và chia cho 100 thành 0.012.
  const defaultThreshold = input.dscr_default_threshold !== undefined && input.dscr_default_threshold !== null && input.dscr_default_threshold > 0 ? asNumber(input.dscr_default_threshold) : 1;
  const warningThreshold = input.dscr_warning_threshold !== undefined && input.dscr_warning_threshold !== null && input.dscr_warning_threshold > 0 ? asNumber(input.dscr_warning_threshold) : 1.2;
  let status: FsraResult["risk_status"] = "Thiếu dữ liệu";
  if (dscrPost !== null) {
    if (dscrPost < defaultThreshold) status = "Stress dòng tiền";
    else if (dscrPost < warningThreshold) status = "Cảnh báo covenant";
    else status = "Đạt covenant";
  } else {
    notes.push("Debt service phải lớn hơn 0 để tính DSCR.");
  }
  if (input.year <= 2025 && n("eu_export_t") > 0) notes.push("Năm 2025: direct CBAM certificate cost được đặt bằng 0 trong Base Case.");
  if (input.year > 2025 && coverageMissing) notes.push(`CBAM coverage ${input.year} được suy ra từ lịch phase-in mặc định; hãy kiểm tra mã hàng và quy định áp dụng.`);
  if (n("eu_export_t") === 0) notes.push("EU export bằng 0 nên CBAM exposure bằng 0.");
  if (baseCfads <= 0) notes.push("Thiếu CFADS dương: hãy kiểm tra EBITDA, cash tax, ΔNWC và maintenance CapEx.");

  return {
    ...input,
    verified_emissions_calc_t: verified,
    adjusted_allocation_t: adjustedAllocation,
    carbon_deficit_t: deficit,
    domestic_liability_eur_000: domesticLiability,
    domestic_market_phase: marketPhase,
    domestic_ets_start_year_used: etsStartUsed,
    eu_embedded_emissions_t: euEmbedded,
    cbam_coverage_used: coverage,
    gross_cbam_eur_000: grossCbam,
    origin_credit_eur_000: originCredit,
    net_cbam_eur_000: netCbam,
    domestic_cash_burden_eur_000: domesticBurden,
    exporter_cbam_burden_eur_000: cbamBurden,
    carbon_cash_burden_eur_000: carbonBurden,
    tax_shield_eur_000: taxShield,
    base_cfads_eur_000: baseCfads,
    post_carbon_cfads_eur_000: postCfads,
    dscr_pre_carbon: dscrPre,
    dscr_post_carbon: dscrPost,
    risk_status: status,
    notes,
  };
}

export function exportInputWorkbook() {
  const blankRows = Array.from({ length: 3 }, () => Object.fromEntries(FIELD_DEFINITIONS.map(([field]) => [field, ""])));

  // Ví dụ tham khảo: lấy nguyên dữ liệu minh họa của app, sắp theo đúng thứ tự cột
  // của Inputs để người dùng đối chiếu nhanh khi điền field mới (VD domestic_market_regime,
  // domestic_ets_start_year, origin_price_paid_eur...).
  const exampleRows = sampleInputs.map((row) => {
    const ordered: Record<string, unknown> = {};
    FIELD_DEFINITIONS.forEach(([field]) => {
      ordered[field] = (row as unknown as Record<string, unknown>)[field] ?? "";
    });
    return ordered;
  });

  const guideIntro = [
    { Trường: "ℹ️ Cách dùng", "Mô tả": "Điền sheet 'Inputs'. Để trống field nào không áp dụng — công cụ tự suy luận hoặc dùng mặc định hệ thống khi có thể.", "Đơn vị / định dạng": "" },
    { Trường: "ℹ️ Coverage CBAM", "Mô tả": "Để trống cbam_coverage_factor = tự áp lịch phase-in mặc định theo năm (đã verify theo luật CBAM hiện hành).", "Đơn vị / định dạng": "" },
    { Trường: "ℹ️ ETS nội địa", "Mô tả": "Để trống domestic_ets_start_year = tự dùng mặc định hệ thống (2029, theo QĐ232/NĐ119). Chỉ điền nếu bạn có căn cứ khác cho scenario riêng.", "Đơn vị / định dạng": "" },
    { Trường: "ℹ️ Xem thêm", "Mô tả": "Sheet 'Vi_du' có dữ liệu minh họa đầy đủ để đối chiếu.", "Đơn vị / định dạng": "" },
  ];
  const guideRows = FIELD_DEFINITIONS.map(([field, description, unit]) => ({
    Trường: field,
    "Mô tả": description,
    "Đơn vị / định dạng": unit,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(blankRows), "Inputs");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exampleRows), "Vi_du");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([...guideIntro, ...guideRows]), "Huong_dan");
  XLSX.writeFile(workbook, "FSRA_Input_Template.xlsx");
}

export function exportInputJson() {
  const record = Object.fromEntries(FIELD_DEFINITIONS.map(([field]) => [field, ""]));
  const guide = Object.fromEntries(FIELD_DEFINITIONS.map(([field, description, unit]) => [field, `${description} (${unit})`]));
  const payload = {
    _huong_dan: {
      cach_dung: "Điền mảng 'records'. Để trống field không áp dụng — công cụ tự suy luận hoặc dùng mặc định hệ thống.",
      coverage_cbam: "Để trống cbam_coverage_factor = tự áp lịch phase-in mặc định theo năm.",
      ets_noi_dia: "Để trống domestic_ets_start_year = tự dùng mặc định hệ thống (2029, theo QĐ232/NĐ119).",
      field_theo_field: guide,
    },
    vi_du: sampleInputs,
    records: [record],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "FSRA_Input_Template.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportResults(results: FsraResult[]) {
  const sheet = XLSX.utils.json_to_sheet(results.map(({ notes, ...row }) => ({ ...row, notes: notes.join(" | ") })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Results");
  XLSX.writeFile(workbook, "FSRA_Calculated_Results.xlsx");
}

export const sampleInputs: FsraInput[] = [2026, 2030, 2034].flatMap((year, index) => {
  const coverage = [0.025, 0.485, 1][index];
  return [
    {
      entity: "NKG proxy",
      year,
      exposure_type: "Dual-shock",
      production_t: 800_000,
      activity_intensity_tco2_per_t: 1.78,
      allocated_emissions_t: 1_230_000 - index * 55_000,
      domestic_carbon_price_eur: 15 + index * 12,
      eu_export_t: 150_000,
      embedded_intensity_tco2_per_t: 1.82,
      cbam_price_eur: 78 + index * 8,
      cbam_coverage_factor: coverage,
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
    },
    {
      entity: "Xuân Thành proxy",
      year,
      exposure_type: "Domestic-only",
      production_t: 650_000,
      activity_intensity_tco2_per_t: 0.72,
      allocated_emissions_t: 405_000 - index * 18_000,
      domestic_carbon_price_eur: 15 + index * 12,
      eu_export_t: 0,
      embedded_intensity_tco2_per_t: 0.72,
      cbam_price_eur: 78 + index * 8,
      cbam_coverage_factor: coverage,
      alpha_cbam: 0,
      eta_domestic: 0.2,
      eta_cbam: 0,
      deductible_share: 0.5,
      tax_rate: 0.2,
      ebitda_eur_000: 58_000,
      cash_tax_eur_000: 5_800,
      delta_nwc_eur_000: 2_100,
      maintenance_capex_eur_000: 12_500,
      debt_service_eur_000: 29_000,
    },
    {
      entity: "POW proxy",
      year,
      exposure_type: "Domestic-only",
      generation_mwh: 2_500_000 + index * 80_000,
      emission_factor_g_per_kwh: 650 - index * 25,
      allocated_emissions_t: 1_520_000 - index * 65_000,
      domestic_carbon_price_eur: 15 + index * 12,
      eu_export_t: 0,
      cbam_coverage_factor: 0,
      alpha_cbam: 0,
      eta_domestic: 0.35,
      deductible_share: 0.5,
      tax_rate: 0.2,
      ebitda_eur_000: 112_000,
      cash_tax_eur_000: 15_000,
      delta_nwc_eur_000: 3_000,
      maintenance_capex_eur_000: 25_000,
      debt_service_eur_000: 58_000,
    },
    {
      entity: "HPG proxy",
      year,
      exposure_type: "Dual-shock",
      production_t: 11_000_000,
      activity_intensity_tco2_per_t: 1.91,
      allocated_emissions_t: 19_500_000 - index * 600_000,
      domestic_carbon_price_eur: 4.5 + index * 1.5 ,
      eu_export_t: 1_200_000 ,
      embedded_intensity_tco2_per_t: 1.91 ,
      cbam_price_eur: 78.0 + index * 3.0 ,
      cbam_coverage_factor: coverage,
      alpha_cbam: 1.0,
      eta_domestic: 0.15,
      eta_cbam: 0.20,
      deductible_share: 1.0,
      tax_rate: 0.2,
      ebitda_eur_000: 1_450_000,
      cash_tax_eur_000: 125_000,
      delta_nwc_eur_000: 45_000,
      maintenance_capex_eur_000: 150_000,
      debt_service_eur_000: 780_000,
    }
  ];
});
