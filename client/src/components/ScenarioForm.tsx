/**
 * Scenario builder: nhập tay từng field của FsraInput, không phụ thuộc vào
 * dữ liệu công ty cố định trong sampleInputs. Hệ số CBAM coverage có thể
 * để "Auto" (theo lịch phase-in mặc định của năm được chọn) hoặc "Tùy chỉnh"
 * để test riêng từng scenario (ví dụ ép coverage = 100% để xem tác động
 * full phase-in, hoặc override khi luật thay đổi).
 */
import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultCbamCoverage, DEFAULT_DOMESTIC_ETS_START_YEAR, DEFAULT_DOMESTIC_PILOT_END_YEAR, FsraInput } from "@/lib/fsraEngine";

type FieldKey = Exclude<keyof FsraInput, never>;

type FieldConfig = {
  key: FieldKey;
  label: string;
  unit?: string;
  placeholder?: string;
};

type GroupConfig = {
  title: string;
  hint?: string;
  fields: FieldConfig[];
};

const GROUPS: GroupConfig[] = [
  {
    title: "Nhận diện",
    fields: [
      { key: "entity", label: "Tên doanh nghiệp / scenario", placeholder: "VD: HPG — Scenario A" },
      { key: "year", label: "Năm phân tích", unit: "YYYY", placeholder: String(new Date().getFullYear()) },
      { key: "exposure_type", label: "Loại exposure (tuỳ chọn)", placeholder: "Dual-shock / Domestic-only" },
    ],
  },
  {
    title: "Lớp đơn vị phát thải",
    hint: "Điền verified_emissions_t trực tiếp, hoặc để trống và điền 1 trong 2 cặp bên dưới — công cụ sẽ tự suy ra và cộng dồn nếu có cả hai.",
    fields: [
      { key: "verified_emissions_t", label: "Phát thải đã xác minh", unit: "tCO₂e" },
      { key: "generation_mwh", label: "Sản lượng điện (POW)", unit: "MWh" },
      { key: "emission_factor_g_per_kwh", label: "Cường độ phát thải điện", unit: "gCO₂/kWh" },
      { key: "production_t", label: "Sản lượng sản phẩm", unit: "tấn" },
      { key: "activity_intensity_tco2_per_t", label: "Cường độ phát thải sản xuất", unit: "tCO₂e/tấn" },
    ],
  },
  {
    title: "Hạn ngạch nội địa",
    fields: [
      { key: "allocated_emissions_t", label: "Hạn ngạch được phân bổ", unit: "tCO₂e" },
      { key: "allocation_tightening", label: "Tỷ lệ siết hạn ngạch", unit: "% (0–100)" },
      { key: "domestic_carbon_price_eur", label: "Giá carbon nội địa", unit: "EUR/tCO₂e" },
      { key: "eta_domestic", label: "Domestic pass-through η", unit: "% (0–100)" },
    ],
  },
  {
    title: "CBAM",
    fields: [
      { key: "eu_export_t", label: "Sản lượng xuất EU", unit: "tấn" },
      { key: "embedded_intensity_tco2_per_t", label: "Phát thải nhúng hàng EU", unit: "tCO₂e/tấn" },
      { key: "cbam_price_eur", label: "Giá chứng chỉ CBAM", unit: "EUR/tCO₂e" },
      { key: "alpha_cbam", label: "Tỷ lệ exporter gánh α", unit: "% (0–100)" },
      { key: "eta_cbam", label: "CBAM pass-through η", unit: "% (0–100)" },
    ],
  },
  {
    title: "Origin credit (Điều 9 CBAM)",
    fields: [
      { key: "origin_price_paid_eur", label: "Giá carbon đã trả tại nước xuất xứ", unit: "EUR/tCO₂e" },
      { key: "eligible_embedded_emissions_t", label: "Tấn đủ điều kiện khấu trừ", unit: "tCO₂e" },
    ],
  },
  {
    title: "Thuế & CFADS",
    fields: [
      { key: "deductible_share", label: "Tỷ lệ được khấu trừ thuế", unit: "% (0–100)" },
      { key: "tax_rate", label: "Thuế suất TNDN", unit: "% (0–100)" },
      { key: "ebitda_eur_000", label: "EBITDA", unit: "EUR '000" },
      { key: "cash_tax_eur_000", label: "Cash tax trước carbon", unit: "EUR '000" },
      { key: "delta_nwc_eur_000", label: "Biến động vốn lưu động", unit: "EUR '000" },
      { key: "maintenance_capex_eur_000", label: "Maintenance CapEx", unit: "EUR '000" },
      { key: "debt_service_eur_000", label: "Lãi + gốc đến hạn", unit: "EUR '000" },
    ],
  },
  {
    title: "Ngưỡng covenant (tuỳ chọn)",
    hint: "Để trống sẽ dùng mặc định 1.00x (stress) / 1.20x (cảnh báo).",
    fields: [
      { key: "dscr_default_threshold", label: "Ngưỡng stress/default", unit: "x", placeholder: "1.00" },
      { key: "dscr_warning_threshold", label: "Ngưỡng cảnh báo", unit: "x", placeholder: "1.20" },
    ],
  },
];

const EMPTY_VALUES: Record<string, string> = {};

export function ScenarioForm({ onSubmit }: { onSubmit: (input: FsraInput) => void }) {
  const [values, setValues] = useState<Record<string, string>>(EMPTY_VALUES);
  const [coverageMode, setCoverageMode] = useState<"auto" | "manual">("auto");
  const [coverageValue, setCoverageValue] = useState("");
  const [domesticPhaseMode, setDomesticPhaseMode] = useState<"auto" | "manual">("auto");
  const [domesticPilotEnd, setDomesticPilotEnd] = useState(String(DEFAULT_DOMESTIC_PILOT_END_YEAR));
  const [domesticEtsStart, setDomesticEtsStart] = useState(String(DEFAULT_DOMESTIC_ETS_START_YEAR));

  const year = Number(values.year) || new Date().getFullYear();
  const autoCoveragePreview = useMemo(() => defaultCbamCoverage(year), [year]);

  const setField = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const reset = () => {
    setValues(EMPTY_VALUES);
    setCoverageMode("auto");
    setCoverageValue("");
    setDomesticPhaseMode("auto");
    setDomesticPilotEnd(String(DEFAULT_DOMESTIC_PILOT_END_YEAR));
    setDomesticEtsStart(String(DEFAULT_DOMESTIC_ETS_START_YEAR));
  };

  const handleSubmit = () => {
    const entity = values.entity?.trim() || `Scenario ${new Date().toLocaleTimeString("vi-VN")}`;
    const input: FsraInput = { entity, year };

    GROUPS.flatMap((group) => group.fields).forEach((field) => {
      if (field.key === "entity" || field.key === "year") return;
      const raw = values[field.key as string];
      if (raw === undefined || raw.trim() === "") return;
      if (field.key === "exposure_type") {
        (input as Record<string, unknown>)[field.key] = raw;
        return;
      }
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) (input as Record<string, unknown>)[field.key] = parsed;
    });

    // Coverage: "Auto" nghĩa là KHÔNG set field này, để calculateFsra() tự áp
    // lịch phase-in mặc định theo năm. "Tùy chỉnh" ghi đè cho riêng scenario này —
    // asRate() trong engine tự nhận diện input 0–1 hoặc 0–100.
    if (coverageMode === "manual" && coverageValue.trim() !== "") {
      input.cbam_coverage_factor = Number(coverageValue);
    }

    // Mốc chuyển giao thí điểm → ETS chính thức: "Auto" = không set field, engine tự
    // dùng mặc định hệ thống (2028/2029 theo QĐ232+NĐ119). "Tùy chỉnh" = ghi đè riêng
    // cho scenario này (VD nếu bạn có căn cứ khác, như "2027" theo nghiên cứu riêng).
    if (domesticPhaseMode === "manual") {
      const pilotEnd = Number(domesticPilotEnd);
      const etsStart = Number(domesticEtsStart);
      if (Number.isFinite(pilotEnd)) input.domestic_pilot_end_year = pilotEnd;
      if (Number.isFinite(etsStart)) input.domestic_ets_start_year = etsStart;
    }

    onSubmit(input);
    reset();
  };

  return (
    <div className="scenario-form">
      <div className="scenario-form-intro">
        <h3>Nhập scenario thủ công</h3>
        <p>Không giới hạn theo dữ liệu công ty cố định — điền field nào cần, để trống field không dùng. Mỗi lần bấm "Thêm scenario" sẽ tạo thêm một dòng entity–năm mới để so sánh.</p>
      </div>

      {GROUPS.map((group) => (
        <fieldset className="scenario-group" key={group.title}>
          <legend>{group.title}</legend>
          {group.hint && <p className="scenario-hint">{group.hint}</p>}
          <div className="scenario-grid">
            {group.fields.map((field) => (
              <label key={field.key as string} className="scenario-field">
                <span>{field.label}{field.unit ? <i>{field.unit}</i> : null}</span>
                <input
                  type={field.key === "entity" || field.key === "exposure_type" ? "text" : "number"}
                  value={values[field.key as string] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) => setField(field.key as string, event.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="scenario-group scenario-coverage">
        <legend>Giai đoạn thị trường carbon nội địa (thí điểm → ETS)</legend>
        <p className="scenario-hint">
          Mặc định hệ thống theo Quyết định 232/QĐ-TTg + Nghị định 119/2025/NĐ-CP: thí điểm đến hết{" "}
          <strong>{DEFAULT_DOMESTIC_PILOT_END_YEAR}</strong>, ETS chính thức (đấu giá) từ{" "}
          <strong>{DEFAULT_DOMESTIC_ETS_START_YEAR}</strong>. Nếu bạn có căn cứ khác (VD nghiên cứu riêng cho rằng
          phiên giao dịch thí điểm cuối là năm khác), chọn "Tùy chỉnh" để đặt mốc riêng cho scenario này — không
          ảnh hưởng các scenario khác.
        </p>
        <div className="coverage-toggle">
          <label className={domesticPhaseMode === "auto" ? "active" : ""}>
            <input type="radio" name="domestic-phase-mode" checked={domesticPhaseMode === "auto"} onChange={() => setDomesticPhaseMode("auto")} />
            Auto (mặc định QĐ232/NĐ119)
          </label>
          <label className={domesticPhaseMode === "manual" ? "active" : ""}>
            <input type="radio" name="domestic-phase-mode" checked={domesticPhaseMode === "manual"} onChange={() => setDomesticPhaseMode("manual")} />
            Tùy chỉnh
          </label>
          {domesticPhaseMode === "manual" && (
            <>
              <label className="coverage-year-field">
                <span>Năm cuối thí điểm</span>
                <input className="coverage-input" type="number" value={domesticPilotEnd} onChange={(event) => setDomesticPilotEnd(event.target.value)} />
              </label>
              <label className="coverage-year-field">
                <span>Năm ETS chính thức</span>
                <input className="coverage-input" type="number" value={domesticEtsStart} onChange={(event) => setDomesticEtsStart(event.target.value)} />
              </label>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="scenario-group scenario-coverage">
        <legend>Hệ số CBAM coverage cho scenario này</legend>
        <p className="scenario-hint">
          Mặc định theo lịch phase-in luật hiện hành cho năm {year}: <strong>{(autoCoveragePreview * 100).toFixed(1)}%</strong>.
          Chọn "Tùy chỉnh" để test riêng scenario này (ví dụ ép 100% để xem kịch bản full phase-in, hoặc theo đề xuất luật mới).
        </p>
        <div className="coverage-toggle">
          <label className={coverageMode === "auto" ? "active" : ""}>
            <input type="radio" name="coverage-mode" checked={coverageMode === "auto"} onChange={() => setCoverageMode("auto")} />
            Auto (theo lịch phase-in {year})
          </label>
          <label className={coverageMode === "manual" ? "active" : ""}>
            <input type="radio" name="coverage-mode" checked={coverageMode === "manual"} onChange={() => setCoverageMode("manual")} />
            Tùy chỉnh
          </label>
          {coverageMode === "manual" && (
            <input
              className="coverage-input"
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="VD: 2.5 (%) hoặc 0.025"
              value={coverageValue}
              onChange={(event) => setCoverageValue(event.target.value)}
            />
          )}
        </div>
      </fieldset>

      <div className="scenario-actions">
        <Button onClick={handleSubmit}><Plus size={16} /> Thêm scenario</Button>
        <Button variant="ghost" onClick={reset}><RotateCcw size={15} /> Xóa form</Button>
      </div>
    </div>
  );
}
