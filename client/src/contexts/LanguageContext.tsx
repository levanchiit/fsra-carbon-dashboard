import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Language = "vi" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

// UI translation layer. The calculation engine keeps its Vietnamese internal status/note
// values for backwards compatibility; the rendered interface is translated at the DOM edge.
// Add or edit entries here if you want to change the English wording later.
const TRANSLATIONS: Record<string, string> = {
  "Trang đầu": "Home",
  "Điều hướng chính": "Main navigation",
  "Kết quả": "Results",
  "Công thức": "Formula",
  "Xử lý cục bộ": "Local processing",
  "Tệp không rời trình duyệt.": "Files never leave your browser.",
  "Tải template": "Download template",
  "Từ phát thải đến covenant,": "From emissions to covenant,",
  "không bỏ sót một bước.": "without missing a step.",
  "Đọc Excel hoặc JSON, kiểm tra đơn vị và truy vết toàn bộ bridge từ carbon liability đến DSCR.": "Read Excel or JSON, validate units, and trace the full bridge from carbon liability to DSCR.",
  "Ngưỡng covenant": "Covenant threshold",
  "Chọn cách nhập dữ liệu": "Choose data input method",
  "Tải tệp / Kéo-thả": "Upload / Drag & drop",
  "Nhập tay": "Manual entry",
  "Dữ liệu đã sẵn sàng": "Data ready",
  "Dữ liệu minh họa": "Demo data",
  "Dữ liệu minh họa — không phải số liệu doanh nghiệp": "Demo data — not company data",
  "Đổi tệp": "Change file",
  "Kéo tệp vào workbench": "Drop a file into the workbench",
  "Thả tệp để phân tích": "Drop file to analyze",
  "Đang kiểm tra...": "Checking...",
  "Chọn tệp": "Choose file",
  "Đã nạp bộ dữ liệu minh họa 2026–2034": "Loaded demo dataset 2026–2034",
  "Đã đọc": "Read",
  "dòng": "rows",
  "đối tượng": "entities",
  "Xóa": "Clear",
  "Xóa form": "Reset form",
  "Xử lý cục bộ": "Local processing",
  "Bridge được áp dụng": "Applied bridge",
  "Giải thích công thức": "Explain formula",
  "Mỗi liability chỉ đi qua CFADS một lần. CBAM được điều chỉnh theo coverage, origin credit, alpha và pass-through.": "Each liability flows through CFADS only once. CBAM is adjusted for coverage, origin credit, alpha, and pass-through.",
  "Tỷ lệ burden exporter thực sự gánh": "Share of burden borne by the exporter",
  "Tỷ lệ chuyển được vào giá bán": "Share passed through to selling prices",
  "Tax shield không vượt cash tax": "Tax shield capped at cash tax",
  "Xem schema": "View schema",
  "Tín hiệu covenant theo đối tượng": "Covenant signals by entity",
  "Xuất kết quả": "Export results",
  "kỳ": "periods",
  "Trước và sau carbon": "Before and after carbon",
  "Nghĩa vụ tiền mặt": "Cash burden",
  "Số trên cột cam = % coverage CBAM đã áp cho năm đó. Chấm dưới trục năm:": "Numbers on the bars show the CBAM coverage applied for that year. Dots below the year axis show:",
  "thí điểm": "pilot",
  "ETS chính thức": "Full ETS",
  "Bridge theo năm": "Annual bridge",
  "Trạng thái": "Status",
  "Kiểm tra tự động": "Automated checks",
  "Tax shield được cap bởi cash tax": "Tax shield is capped by cash tax",
  "CBAM 2025 đặt bằng 0 trong Base Case": "CBAM 2025 is set to zero in the Base Case",
  "Không clamp DSCR âm thành 0": "Negative DSCR is not clamped to zero",
  "Mô phỏng phân phối giá carbon tương quan. Xác suất dưới đây là covenant/default indicator, không phải IFRS 9 PD.": "Simulate a correlated carbon-price distribution. The probabilities below are covenant/default indicators, not IFRS 9 PDs.",
  "Thay giả định rồi chạy lại": "Change assumptions and rerun",
  "Chạy mô phỏng": "Run simulation",
  "Phân phối DSCR sau carbon": "Post-carbon DSCR distribution",
  "Tỷ trọng paths": "Path share",
  "Hàng:": "Rows:",
  "Cột:": "Columns:",
  "Mỗi ô dùng cùng seed để so sánh nhất quán.": "Each cell uses the same seed for consistent comparison.",
  "Lower breach risk": "Lower breach risk",
  "Higher breach risk": "Higher breach risk",
  "Kết quả sẽ xuất hiện ở đây": "Results will appear here",
  "Tải tệp hoặc dùng dữ liệu minh họa để kiểm tra toàn bộ luồng tính. Mọi giá trị minh họa đều được ghi rõ và không đại diện cho doanh nghiệp thật.": "Upload a file or use demo data to test the full calculation flow. All demo values are clearly identified and do not represent a real company.",
  "Schema đầu vào": "Input schema",
  "Tạo worksheet": "Create a worksheet",
  "Tên trường không phân biệt hoa thường": "Field names are case-insensitive",
  "Đã hiểu": "Got it",
  "Đóng": "Close",
  "Nhập scenario thủ công": "Enter a manual scenario",
  "Không giới hạn theo dữ liệu công ty cố định — điền field nào cần, để trống field không dùng. Mỗi lần bấm \"Thêm scenario\" sẽ tạo thêm một dòng entity–năm mới để so sánh.": "There is no fixed company-data limit — fill in the fields you need and leave unused fields blank. Each click of \"Add scenario\" creates a new entity-year row for comparison.",
  "Nhận diện": "Identification",
  "Tên doanh nghiệp / scenario": "Company / scenario name",
  "Năm phân tích": "Analysis year",
  "Loại exposure (tuỳ chọn)": "Exposure type (optional)",
  "Lớp đơn vị phát thải": "Emissions unit layer",
  "Điền verified_emissions_t trực tiếp, hoặc để trống và điền 1 trong 2 cặp bên dưới — công cụ sẽ tự suy ra và cộng dồn nếu có cả hai.": "Enter verified_emissions_t directly, or leave it blank and provide one or both of the pairs below — the tool will infer emissions and aggregate both sources when available.",
  "Phát thải đã xác minh": "Verified emissions",
  "Sản lượng điện (POW)": "Electricity generation (POW)",
  "Cường độ phát thải điện": "Electricity emissions intensity",
  "Sản lượng sản phẩm": "Product output",
  "Cường độ phát thải sản xuất": "Production emissions intensity",
  "Hạn ngạch nội địa": "Domestic allocation",
  "Hạn ngạch được phân bổ": "Allocated emissions",
  "Tỷ lệ siết hạn ngạch": "Allocation tightening rate",
  "Giá carbon nội địa": "Domestic carbon price",
  "Sản lượng xuất EU": "EU export volume",
  "Phát thải nhúng hàng EU": "Embedded emissions in EU exports",
  "Giá chứng chỉ CBAM": "CBAM certificate price",
  "Tỷ lệ exporter gánh α": "Exporter burden share α",
  "Origin credit (Điều 9 CBAM)": "Origin credit (CBAM Article 9)",
  "Giá carbon đã trả tại nước xuất xứ": "Carbon price paid in the country of origin",
  "Tấn đủ điều kiện khấu trừ": "Eligible tonnes for deduction",
  "Thuế & CFADS": "Tax & CFADS",
  "Tỷ lệ được khấu trừ thuế": "Tax-deductible share",
  "Thuế suất TNDN": "Corporate income tax rate",
  "Cash tax trước carbon": "Cash tax before carbon",
  "Biến động vốn lưu động": "Change in working capital",
  "Lãi + gốc đến hạn": "Interest + principal due",
  "Ngưỡng covenant (tuỳ chọn)": "Covenant thresholds (optional)",
  "Để trống sẽ dùng mặc định 1.00x (stress) / 1.20x (cảnh báo).": "Leave blank to use the defaults of 1.00x (stress) / 1.20x (warning).",
  "Ngưỡng stress/default": "Stress/default threshold",
  "Ngưỡng cảnh báo": "Warning threshold",
  "Giai đoạn thị trường carbon nội địa (thí điểm → ETS)": "Domestic carbon market phase (pilot → ETS)",
  "Mặc định hệ thống theo Quyết định 232/QĐ-TTg + Nghị định 119/2025/NĐ-CP: thí điểm đến hết": "System default under Decision 232/QĐ-TTg + Decree 119/2025/NĐ-CP: pilot through",
  "ETS chính thức (đấu giá) từ": "full ETS (auction-based) from",
  "Nếu bạn có căn cứ khác": "If you have another basis",
  "Tùy chỉnh": "Custom",
  "Năm cuối thí điểm": "Pilot end year",
  "Năm ETS chính thức": "Full ETS start year",
  "Hệ số CBAM coverage cho scenario này": "CBAM coverage factor for this scenario",
  "Mặc định theo lịch phase-in luật hiện hành cho năm": "Default under the current legal phase-in schedule for year",
  "Chọn \"Tùy chỉnh\" để test riêng scenario này": "Select \"Custom\" to test this scenario separately",
  "Thêm scenario": "Add scenario",
  "Xóa form": "Reset form",
  "Dữ liệu minh họa": "Demo data",
  "Từ phát thải đến covenant": "From emissions to covenant",
  "Phân phối DSCR sau carbon": "Post-carbon DSCR distribution",
  "Stress &lt;1.00x": "Stress <1.00x",
  "Watch 1.00–1.20x": "Watch 1.00–1.20x",
  "Pass ≥1.20x": "Pass ≥1.20x",
  "Tải tệp": "Upload file",
  "hoặc mảng JSON. Chấp nhận XLSX, XLS, CSV và JSON.": "or a JSON array. XLSX, XLS, CSV, and JSON are supported.",
  "Đọc worksheet": "Read worksheet",
  "Công thức": "Formula",
  "Kết quả": "Results",
  "Auto (mặc định QĐ232/NĐ119)": "Auto (Decision 232/Decree 119 default)",
  "Auto (theo lịch phase-in": "Auto (current phase-in schedule",
  "Đang kiểm tra": "Checking",
  "Đã thêm scenario": "Added scenario",
  "NM": "N/A",
  "Đạt covenant": "Covenant met",
  "Cảnh báo covenant": "Covenant warning",
  "Stress dòng tiền": "Cash-flow stress",
  "Thiếu dữ liệu": "Missing data",
  "Thiếu phát thải đã xác minh hoặc dữ liệu hoạt động để suy ra phát thải.": "Missing verified emissions or activity data needed to infer emissions.",
  "Phát thải POW được suy ra từ MWh × gCO₂/kWh ÷ 1.000.": "POW emissions are inferred from MWh × gCO₂/kWh ÷ 1,000.",
  "Phát thải sản xuất được suy ra từ sản lượng × cường độ hoạt động.": "Production emissions are inferred from output × activity intensity.",
  "Đã cộng dồn phát thải từ cả hai nguồn (điện + sản xuất) cho entity đa ngành.": "Emissions from both sources (electricity + production) were aggregated for the multi-industry entity.",
  "Debt service phải lớn hơn 0 để tính DSCR.": "Debt service must be greater than 0 to calculate DSCR.",
  "EU export bằng 0 nên CBAM exposure bằng 0.": "EU exports are zero, so CBAM exposure is zero.",
  "Thiếu CFADS dương: hãy kiểm tra EBITDA, cash tax, ΔNWC và maintenance CapEx.": "Positive CFADS is missing: check EBITDA, cash tax, ΔNWC, and maintenance CapEx.",
  "Năm 2025: direct CBAM certificate cost được đặt bằng 0 trong Base Case.": "2025: direct CBAM certificate cost is set to zero in the Base Case.",
  "CBAM coverage": "CBAM coverage",
  "được suy ra từ lịch phase-in mặc định; hãy kiểm tra mã hàng và quy định áp dụng.": "is inferred from the default phase-in schedule; check the product code and applicable rules.",
};

const entries = Object.entries(TRANSLATIONS).sort((a, b) => b[0].length - a[0].length);

function translateText(value: string) {
  let result = value;
  for (const [from, to] of entries) {
    if (result.includes(from)) result = result.split(from).join(to);
  }
  return result;
}

const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string | null>>();

function restoreNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const original = originalText.get(node);
    if (original !== undefined) node.nodeValue = original;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as HTMLElement;
  const attrs = originalAttributes.get(element);
  if (attrs) for (const [attribute, value] of attrs) {
    if (value === null) element.removeAttribute(attribute);
    else element.setAttribute(attribute, value);
  }
  node.childNodes.forEach(restoreNode);
}

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? "";
    if (!originalText.has(node)) originalText.set(node, text);
    const translated = translateText(text);
    if (translated !== text) node.nodeValue = translated;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as HTMLElement;
  for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
    const value = element.getAttribute(attribute);
    if (!originalAttributes.has(element)) originalAttributes.set(element, new Map());
    const attrs = originalAttributes.get(element)!;
    if (!attrs.has(attribute)) attrs.set(attribute, value);
    if (value) {
      const translated = translateText(value);
      if (translated !== value) element.setAttribute(attribute, translated);
    }
  }
  node.childNodes.forEach(translateNode);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "vi";
    return window.localStorage.getItem("fsra-language") === "en" ? "en" : "vi";
  });

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem("fsra-language", next);
  };

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "vi";
    if (language !== "en") {
      restoreNode(document.body);
      return;
    }

    const apply = () => translateNode(document.body);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt"] });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage: () => setLanguage(language === "en" ? "vi" : "en") }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
