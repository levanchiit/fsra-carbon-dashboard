/**
 * Climate Risk Lab: asymmetric analytical workbench, warm ledger surfaces,
 * carbon-teal actions, monospace formula tags, and restrained risk colors.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Braces,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  Leaf,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import excelArt from "@shared/excel.jpeg";
import { ScenarioForm } from "@/components/ScenarioForm";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calculateFsra,
  exportInputJson,
  exportInputWorkbook,
  exportResults,
  FIELD_DEFINITIONS,
  FsraInput,
  FsraResult,
  parseFsraFile,
  sampleInputs,
} from "@/lib/fsraEngine";
import { DEFAULT_SIMULATION, runMonteCarlo, runSensitivityMatrix, SimulationConfig } from "@/lib/monteCarlo";

const LOGO = "/logo.jpeg";
const HERO = "/manus-storage/fsra-carbon-ribbon-hero_5d40efad.png";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const ratio = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("vi-VN", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fmt(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "NM";
  return `${ratio.format(value)}${suffix}`;
}

function RiskRibbon({ className = "" }: { className?: string }) {
  return <div className={`risk-ribbon ${className}`} aria-hidden="true"><i /><i /><i /></div>;
}

function statusClass(status: FsraResult["risk_status"]) {
  if (status === "Đạt covenant") return "status-good";
  if (status === "Cảnh báo covenant") return "status-watch";
  if (status === "Stress dòng tiền") return "status-risk";
  return "status-neutral";
}

function heatStyle(value: number) {
  if (value < 0.25) return { backgroundColor: `rgba(22,135,126,${0.1 + value * 1.5})`, color: "#174f4a" };
  if (value < 0.65) return { backgroundColor: `rgba(195,138,50,${0.2 + value * 0.7})`, color: value > 0.52 ? "#fffaf0" : "#6c4b1c" };
  return { backgroundColor: `rgba(167,67,54,${0.28 + value * 0.65})`, color: "white" };
}

function KpiCard({ label, value, meta, tone = "teal" }: { label: string; value: string; meta: string; tone?: "teal" | "navy" | "amber" | "brick" }) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div className="ledger-ticks" />
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{meta}</span>
    </article>
  );
}

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const demoMode = initialParams.get("demo") === "1";
  const schemaMode = initialParams.get("schema") === "1";
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(demoMode ? "Dữ liệu minh họa — không phải số liệu doanh nghiệp" : null);
  const [inputs, setInputs] = useState<FsraInput[]>(demoMode ? sampleInputs : []);
  const [entryMode, setEntryMode] = useState<"upload" | "manual">("upload");
  const [selectedEntity, setSelectedEntity] = useState<string>(demoMode ? "NKG proxy" : "");
  const [schemaOpen, setSchemaOpen] = useState(schemaMode);
  const [simulationDraft, setSimulationDraft] = useState<SimulationConfig>(DEFAULT_SIMULATION);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION);

  const results = useMemo(() => inputs.map(calculateFsra), [inputs]);
  const entities = useMemo(() => Array.from(new Set(results.map((row) => row.entity))), [results]);
  const activeEntity = selectedEntity || entities[0] || "";
  const activeRows = useMemo(
    () => results.filter((row) => row.entity === activeEntity).sort((a, b) => a.year - b.year),
    [results, activeEntity],
  );
  const latest = activeRows.at(-1);
  const allNotes = useMemo(() => Array.from(new Set(results.flatMap((row) => row.notes))), [results]);
  const criticalNotes = useMemo(() => allNotes.filter((note) => note.startsWith("Thiếu") || note.includes("phải lớn hơn")), [allNotes]);
  const readiness = Math.max(0, 100 - criticalNotes.length * 18);
  const simulation = useMemo(() => latest ? runMonteCarlo(latest, simulationConfig) : null, [latest, simulationConfig]);
  const sensitivity = useMemo(() => latest ? runSensitivityMatrix(latest, simulationConfig) : null, [latest, simulationConfig]);

  const processFile = useCallback(async (file?: File) => {
    if (!file) return;
    setIsParsing(true);
    try {
      const parsed = await parseFsraFile(file);
      if (!parsed.length) throw new Error("Không tìm thấy dòng dữ liệu nào trong tệp.");
      setInputs(parsed);
      setSelectedEntity(parsed[0]?.entity ?? "");
      setFileName(file.name);
      toast.success(`Đã đọc ${parsed.length} dòng dữ liệu từ ${file.name}`);
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đọc tệp.";
      toast.error(message);
    } finally {
      setIsParsing(false);
      setIsDragging(false);
    }
  }, []);

  const loadSample = () => {
    setInputs(sampleInputs);
    setSelectedEntity("NKG proxy");
    setFileName("Dữ liệu minh họa — không phải số liệu doanh nghiệp");
    toast.success("Đã nạp bộ dữ liệu minh họa 2026–2034");
    window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const clearData = () => {
    setInputs([]);
    setFileName(null);
    setSelectedEntity("");
  };

  // Thêm scenario nhập tay: cộng dồn vào danh sách hiện có (không ghi đè dữ liệu
  // đã upload), để có thể so sánh nhiều scenario/entity cùng lúc, không giới hạn
  // theo dữ liệu công ty cố định trong sampleInputs.
  const addManualScenario = (input: FsraInput) => {
    setInputs((current) => [...current, input]);
    setSelectedEntity(input.entity);
    setFileName((current) => current ?? `Scenario thủ công — bắt đầu từ ${input.entity}`);
    toast.success(`Đã thêm scenario "${input.entity}" (năm ${input.year})`);
    window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Xóa một dòng entity–năm cụ thể khỏi danh sách (không phải xóa toàn bộ dữ liệu).
  const removeRow = (entity: string, year: number) => {
    setInputs((current) => current.filter((row) => !(row.entity === entity && row.year === year)));
  };

  const updateSimulation = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => {
    setSimulationDraft((current) => ({ ...current, [key]: value }));
  };

  const applySimulation = () => {
    setSimulationConfig({ ...simulationDraft });
    toast.success(`Đã chạy ${whole.format(simulationDraft.paths)} paths với seed ${simulationDraft.seed}`);
  };

  const chartData = activeRows.map((row) => ({
    year: row.year,
    "DSCR trước carbon": Number(row.dscr_pre_carbon?.toFixed(2)),
    "DSCR sau carbon": Number(row.dscr_post_carbon?.toFixed(2)),
    "Domestic burden": Number(row.domestic_cash_burden_eur_000.toFixed(1)),
    "CBAM burden": Number(row.exporter_cbam_burden_eur_000.toFixed(1)),
    "Tax shield": Number(row.tax_shield_eur_000.toFixed(1)),
    phase: row.domestic_market_phase,
    coverage: row.cbam_coverage_used,
  }));

  // Năm chuyển giao thí điểm → ETS chính thức để vẽ vạch mốc trên 2 biểu đồ (nếu nằm
  // trong khoảng năm đang hiển thị). Lấy từ dòng đầu tiên chuyển sang "ets" trong activeRows.
  const etsTransitionYear = activeRows.find((row) => row.domestic_market_phase === "ets")?.domestic_ets_start_year_used;
  const showTransitionLine = etsTransitionYear !== undefined
    && chartData.some((d) => d.year === etsTransitionYear)
    && chartData.some((d) => d.phase === "pilot");

  // Custom X-axis tick: hiện năm + chấm màu giai đoạn (nâu-xám = thí điểm, xanh = ETS
  // chính thức) để nhìn được ngay trên biểu đồ, không chỉ trong KPI/notes.
  const PhaseTick = (props: { x?: number; y?: number; payload?: { value: number | string } }) => {
    const { x = 0, y = 0, payload } = props;
    const year = payload?.value;
    const point = chartData.find((d) => d.year === year);
    const isEts = point?.phase === "ets";
    return (
      <g transform={`translate(${x},${y})`}>
        <circle cx={0} cy={4} r={2.6} fill={isEts ? "#16877e" : "#b7a37c"} />
        <text x={9} y={8} textAnchor="start" fontSize={11} fill="#6a746f">{year}</text>
      </g>
    );
  };

  const dscrDelta = latest?.dscr_pre_carbon !== null && latest?.dscr_post_carbon !== null
    ? (latest?.dscr_post_carbon ?? 0) - (latest?.dscr_pre_carbon ?? 0)
    : null;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#top" className="brand-mark" aria-label="FSRA Compass — Trang đầu">
          <img src={LOGO} alt="" />
          <div><strong>FSRA</strong><span>Compass</span></div>
        </a>

        <nav aria-label="Điều hướng chính">
          <a href="#workspace" className="active"><UploadCloud size={17} /><span>Workbench</span></a>
          <a href="#results"><CircleGauge size={17} /><span>Kết quả</span></a>
          <a href="#simulation"><Activity size={17} /><span>Monte Carlo</span></a>
          <a href="#formula"><Calculator size={17} /><span>Công thức</span></a>
          <button onClick={() => setSchemaOpen(true)}><Database size={17} /><span>Data schema</span></button>
        </nav>

        <div className="sidebar-note">
          <ShieldCheck size={17} />
          <p><strong>Xử lý cục bộ</strong><br />Tệp không rời trình duyệt.</p>
        </div>
      </aside>

      <main id="top">
        <header className="topbar">
          <div className="topbar-brand">
            <img src={LOGO} alt="" />
            <div>
              <span className="eyebrow">FSRA COMPASS · CLIMATE CREDIT RISK WORKBENCH</span>
              <h1>Carbon & DSCR</h1>
            </div>
          </div>
          <div className="top-actions">
            <div className="language-toggle" role="group" aria-label="Language">
              <button type="button" className={language === "en" ? "active" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
              <button type="button" className={language === "vi" ? "active" : ""} aria-pressed={language === "vi"} onClick={() => setLanguage("vi")}>VN</button>
            </div>
            <Badge variant="outline" className="method-badge"><Leaf size={13} /> Method v1.0</Badge>
            <Button variant="outline" className="template-button" onClick={exportInputWorkbook}>
              <Download size={16} /> Tải template
            </Button>
          </div>
        </header>
        <RiskRibbon className="top-ribbon" />

        <section className="hero-strip" aria-labelledby="hero-title">
          <img src={HERO} alt="" aria-hidden="true" />
          <div className="hero-overlay" />
          <div className="hero-copy">
            <span>CARBON → CASH FLOW → COVENANT</span>
            <h2 id="hero-title">Từ phát thải đến covenant,<br />không bỏ sót một bước.</h2>
            <p>Đọc Excel hoặc JSON, kiểm tra đơn vị và truy vết toàn bộ bridge từ carbon liability đến DSCR.</p>
            <div className="hero-audit-tags"><code>Eᵥ − Eₐ</code><span>→</span><code>CL<sub>cash</sub></code><span>→</span><code>CFADS<sub>post</sub></code><span>→</span><code>DSCR</code></div>
          </div>
          <div className="hero-metric">
            <small>Ngưỡng covenant</small>
            <strong>1.20<sup>x</sup></strong>
            <span>Severe stress &lt; 1.00x</span>
          </div>
        </section>

        <section id="workspace" className="workspace-grid">
          <div className="entry-mode-tabs" role="tablist" aria-label="Chọn cách nhập dữ liệu">
            <button role="tab" aria-selected={entryMode === "upload"} className={entryMode === "upload" ? "active" : ""} onClick={() => setEntryMode("upload")}>
              <UploadCloud size={16} /> Tải tệp / Kéo-thả
            </button>
            <button role="tab" aria-selected={entryMode === "manual"} className={entryMode === "manual" ? "active" : ""} onClick={() => setEntryMode("manual")}>
              <Calculator size={16} /> Nhập tay
            </button>
          </div>

          {entryMode === "upload" ? (
          <div
            className={`dropzone ${isDragging ? "dragging" : ""} ${fileName ? "has-file" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
            onDrop={(event) => { event.preventDefault(); processFile(event.dataTransfer.files[0]); }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="sr-only"
              onChange={(event) => processFile(event.target.files?.[0])}
            />
            <div className="drop-copy">
              <span className="section-index">01 / DATA INGESTION</span>
              {fileName ? (
                <>
                  <div className="file-orb"><CheckCircle2 size={28} /></div>
                  <h3>Dữ liệu đã sẵn sàng</h3>
                  <p className="file-name">{fileName}</p>
                  <div className="file-stats">
                    <span>{inputs.length} dòng</span><i /> <span>{entities.length} đối tượng</span>
                  </div>
                  <div className="drop-actions">
                    <Button onClick={() => inputRef.current?.click()} disabled={isParsing}>Đổi tệp</Button>
                    <Button variant="ghost" onClick={clearData}><X size={16} /> Xóa</Button>
                  </div>
                </>
              ) : (
                <>
                  <img src={excelArt} alt="Minh họa tệp Excel và JSON" className="upload-art" />
                  <h3>{isDragging ? "Thả tệp để phân tích" : "Kéo tệp vào workbench"}</h3>
                  <p>Đọc worksheet <code>Inputs</code> hoặc mảng JSON. Chấp nhận XLSX, XLS, CSV và JSON.</p>
                  <div className="drop-actions">
                    <Button onClick={() => inputRef.current?.click()} disabled={isParsing}>
                      {isParsing ? "Đang kiểm tra..." : <><UploadCloud size={17} /> Chọn tệp</>}
                    </Button>
                    <Button variant="outline" onClick={loadSample}><Play size={16} /> Dữ liệu minh họa</Button>
                  </div>
                </>
              )}
            </div>
            {!fileName && <div className="drop-trace" aria-hidden="true"><span><b>01</b><code>verified_emissions_t</code></span><i /><span><b>02</b><code>allocated_emissions_t</code></span><i /><span><b>03</b><code>debt_service_eur_000</code></span></div>}
            <div className="format-rail">
              <span><FileSpreadsheet size={18} /> Excel</span>
              <span><FileJson size={18} /> JSON</span>
              <span><Braces size={18} /> Local</span>
            </div>
          </div>
          ) : (
            <ScenarioForm onSubmit={addManualScenario} />
          )}

          <aside id="formula" className="formula-panel">
            <div className="panel-heading">
              <div><span className="section-index">02 / FORMULA TRACE</span><h3>Bridge được áp dụng</h3></div>
              <Tooltip>
                <TooltipTrigger asChild><button className="icon-button" aria-label="Giải thích công thức"><Info size={16} /></button></TooltipTrigger>
                <TooltipContent className="max-w-xs">Mỗi liability chỉ đi qua CFADS một lần. CBAM được điều chỉnh theo coverage, origin credit, alpha và pass-through.</TooltipContent>
              </Tooltip>
            </div>
            <RiskRibbon className="panel-ribbon" />
            <div className="formula-flow">
              <article><span>F.01</span><code>Eᵥ − Eₐ</code><p>Carbon deficit</p></article>
              <ChevronRight size={16} />
              <article><span>F.02</span><code>CL<sub>dom</sub> + CL<sub>cbam</sub></code><p>Cash burden</p></article>
              <ChevronRight size={16} />
              <article><span>F.03</span><code>CFADS − CL + TS</code><p>Post-carbon CFADS</p></article>
              <ChevronRight size={16} />
              <article><span>F.04</span><code>CFADS / DS</code><p>DSCR</p></article>
            </div>
            <div className="assumption-list">
              <div><span>α<sub>CBAM</sub></span><p>Tỷ lệ burden exporter thực sự gánh</p></div>
              <div><span>η<sub>pass</sub></span><p>Tỷ lệ chuyển được vào giá bán</p></div>
              <div><span>TS</span><p>Tax shield không vượt cash tax</p></div>
            </div>
            <button className="schema-link" onClick={() => setSchemaOpen(true)}>Xem schema {FIELD_DEFINITIONS.length} trường <ChevronRight size={15} /></button>
          </aside>
        </section>

        {results.length > 0 && latest ? (
          <section id="results" className="results-section">
            <div className="results-heading">
              <div>
                <span className="section-index">03 / CALCULATED OUTPUT</span>
                <h2>Tín hiệu covenant theo đối tượng</h2>
              </div>
              <Button variant="outline" onClick={() => exportResults(results)}><Download size={16} /> Xuất kết quả</Button>
            </div>

            <div className="entity-tabs" role="tablist" aria-label="Chọn đối tượng phân tích">
              {entities.map((entity) => (
                <button key={entity} role="tab" aria-selected={entity === activeEntity} className={entity === activeEntity ? "active" : ""} onClick={() => setSelectedEntity(entity)}>
                  {entity}<span>{results.filter((row) => row.entity === entity).length} kỳ</span>
                </button>
              ))}
            </div>

            <RiskRibbon className="result-ribbon" />
            <div className="kpi-grid">
              <KpiCard label="Verified emissions" value={`${whole.format(latest.verified_emissions_calc_t)} t`} meta={`Kỳ ${latest.year}`} tone="navy" />
              <KpiCard label="Carbon cash burden" value={`€${money.format(latest.carbon_cash_burden_eur_000)}k`} meta={`Domestic (${latest.domestic_market_phase === "pilot" ? "thí điểm" : "ETS chính thức"}) + exporter CBAM · coverage ${percent.format(latest.cbam_coverage_used)}`} tone="amber" />
              <KpiCard label="DSCR sau carbon" value={fmt(latest.dscr_post_carbon, "x")} meta={latest.risk_status} tone={latest.risk_status === "Đạt covenant" ? "teal" : latest.risk_status === "Cảnh báo covenant" ? "amber" : "brick"} />
              <KpiCard label="DSCR impact" value={fmt(dscrDelta, "x")} meta="So với DSCR trước carbon" tone={dscrDelta !== null && dscrDelta < -0.2 ? "brick" : "navy"} />
            </div>

            <div className="analysis-grid">
              <article className="chart-panel wide">
                <div className="panel-heading">
                  <div><span className="section-index">DSCR PATH</span><h3>Trước và sau carbon</h3></div>
                  <Badge className={statusClass(latest.risk_status)}>{latest.risk_status}</Badge>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 15, right: 18, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 6" stroke="#d9ddd8" vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={<PhaseTick />} height={24} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6a746f", fontSize: 12 }} domain={[0, "auto"]} />
                      <ChartTooltip contentStyle={{ border: "1px solid #d8ddd8", borderRadius: 4, boxShadow: "0 16px 40px rgba(18,31,35,.12)", fontSize: 12 }} formatter={(value, name) => [value, name]} labelFormatter={(year) => { const p = chartData.find((d) => d.year === year); return `${year} · ${p?.phase === "ets" ? "ETS chính thức" : "Thí điểm"}`; }} />
                      <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      <ReferenceLine y={1.2} stroke="#c38a32" strokeDasharray="6 5" label={{ value: "1.20x", fill: "#8e6224", fontSize: 11, position: "insideTopRight" }} />
                      <ReferenceLine y={1} stroke="#a74336" strokeDasharray="3 5" label={{ value: "1.00x", fill: "#8e352c", fontSize: 11, position: "insideBottomRight" }} />
                      {showTransitionLine && (
                        <ReferenceLine x={etsTransitionYear} stroke="#16877e" strokeDasharray="2 3" strokeWidth={1.4}>
                          <Label value="→ ETS chính thức" position="insideTopLeft" fill="#16877e" fontSize={10.5} />
                        </ReferenceLine>
                      )}
                      <Line type="monotone" dataKey="DSCR trước carbon" stroke="#173747" strokeWidth={2.3} dot={{ r: 4, fill: "#f7f5ef", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="DSCR sau carbon" stroke="#16877e" strokeWidth={3} dot={{ r: 4, fill: "#16877e", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="chart-panel">
                <div className="panel-heading"><div><span className="section-index">BURDEN BRIDGE</span><h3>Nghĩa vụ tiền mặt</h3></div><span className="unit-tag">EUR '000</span></div>
                <p className="chart-caption">Số trên cột cam = % coverage CBAM đã áp cho năm đó. Chấm dưới trục năm: <span className="phase-dot pilot" /> thí điểm · <span className="phase-dot ets" /> ETS chính thức.</p>
                <div className="chart-wrap compact">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 6" stroke="#d9ddd8" vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={<PhaseTick />} height={24} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6a746f", fontSize: 11 }} />
                      <ChartTooltip contentStyle={{ border: "1px solid #d8ddd8", borderRadius: 4, fontSize: 12 }} labelFormatter={(year) => { const p = chartData.find((d) => d.year === year); return `${year} · ${p?.phase === "ets" ? "ETS chính thức" : "Thí điểm"} · coverage ${percent.format(p?.coverage ?? 0)}`; }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      {showTransitionLine && <ReferenceLine x={etsTransitionYear} stroke="#16877e" strokeDasharray="2 3" strokeWidth={1.4} />}
                      <Bar dataKey="Domestic burden" stackId="a" fill="#173747" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="CBAM burden" stackId="a" fill="#c38a32" radius={[2, 2, 0, 0]}>
                        <LabelList
                          dataKey="CBAM burden"
                          position="top"
                          content={(props: { x?: string | number; width?: string | number; y?: string | number; index?: number }) => {
                            const { x, y, width, index } = props;
                            if (index === undefined) return null;
                            const coverage = chartData[index]?.coverage ?? 0;
                            const cx = Number(x ?? 0) + Number(width ?? 0) / 2;
                            return (
                              <text x={cx} y={Number(y ?? 0) - 5} textAnchor="middle" fontSize={10} fill="#8e6224">
                                {percent.format(coverage)}
                              </text>
                            );
                          }}
                        />
                      </Bar>
                      <Bar dataKey="Tax shield" fill="#72a39c" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>

            <div className="validation-grid">
              <article className="table-panel">
                <div className="panel-heading"><div><span className="section-index">AUDIT TABLE</span><h3>Bridge theo năm</h3></div><span className="unit-tag">EUR '000 · DSCR x</span></div>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Năm</th><th>Domestic</th><th>Net CBAM</th><th>Tax shield</th><th>Base CFADS</th><th>Post CFADS</th><th>DSCR</th><th>Trạng thái</th><th /></tr></thead>
                    <tbody>{activeRows.map((row) => <tr key={`${row.entity}-${row.year}`}>
                      <td>{row.year}</td><td>{money.format(row.domestic_cash_burden_eur_000)}</td><td>{money.format(row.exporter_cbam_burden_eur_000)}</td><td>{money.format(row.tax_shield_eur_000)}</td><td>{money.format(row.base_cfads_eur_000)}</td><td>{money.format(row.post_carbon_cfads_eur_000)}</td><td><strong>{fmt(row.dscr_post_carbon, "x")}</strong></td><td><span className={`status-dot ${statusClass(row.risk_status)}`}>{row.risk_status}</span></td>
                      <td><button className="icon-button" aria-label={`Xóa dòng ${row.entity} ${row.year}`} onClick={() => removeRow(row.entity, row.year)}><X size={14} /></button></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </article>

              <aside className="checks-panel">
                <div className="panel-heading"><div><span className="section-index">VALIDATION</span><h3>Kiểm tra tự động</h3></div><CheckCircle2 size={19} /></div>
                <RiskRibbon className="panel-ribbon" />
                <div className="check-score"><strong>{readiness}%</strong><div><p>Data readiness</p><Progress value={readiness} /></div></div>
                <div className="check-list">
                  <div className="pass"><CheckCircle2 size={16} /><span>Tax shield được cap bởi cash tax</span></div>
                  <div className="pass"><CheckCircle2 size={16} /><span>CBAM 2025 đặt bằng 0 trong Base Case</span></div>
                  <div className="pass"><CheckCircle2 size={16} /><span>Không clamp DSCR âm thành 0</span></div>
                  {allNotes.slice(0, 4).map((note) => {
                    const warning = criticalNotes.includes(note);
                    return <div className={warning ? "warn" : "note"} key={note}>{warning ? <AlertTriangle size={16} /> : <Info size={16} />}<span>{note}</span></div>;
                  })}
                </div>
              </aside>
            </div>

            {simulation && sensitivity && sensitivity.length > 0 && (
              <section id="simulation" className="simulation-section">
                <div className="results-heading simulation-heading">
                  <div>
                    <span className="section-index">04 / STOCHASTIC STRESS</span>
                    <h2>Monte Carlo & sensitivity</h2>
                    <p>Mô phỏng phân phối giá carbon tương quan. Xác suất dưới đây là covenant/default indicator, không phải IFRS 9 PD.</p>
                  </div>
                  <Badge variant="outline" className="simulation-badge">Seed {simulationConfig.seed} · {whole.format(simulation.validPaths)} paths</Badge>
                </div>

                <div className="simulation-controls">
                  <div className="control-intro"><SlidersHorizontal size={19} /><div><strong>Simulation controls</strong><span>Thay giả định rồi chạy lại</span></div></div>
                  <label><span>Paths <b>{whole.format(simulationDraft.paths)}</b></span><input type="range" min="1000" max="25000" step="1000" value={simulationDraft.paths} onChange={(event) => updateSimulation("paths", Number(event.target.value))} /></label>
                  <label><span>Domestic vol <b>{percent.format(simulationDraft.domesticVol)}</b></span><input type="range" min="0" max="0.8" step="0.05" value={simulationDraft.domesticVol} onChange={(event) => updateSimulation("domesticVol", Number(event.target.value))} /></label>
                  <label><span>CBAM vol <b>{percent.format(simulationDraft.cbamVol)}</b></span><input type="range" min="0" max="0.8" step="0.05" value={simulationDraft.cbamVol} onChange={(event) => updateSimulation("cbamVol", Number(event.target.value))} /></label>
                  <label><span>Correlation ρ <b>{ratio.format(simulationDraft.correlation)}</b></span><input type="range" min="-0.9" max="0.9" step="0.05" value={simulationDraft.correlation} onChange={(event) => updateSimulation("correlation", Number(event.target.value))} /></label>
                  <label className="seed-control"><span>Random seed</span><input type="number" value={simulationDraft.seed} onChange={(event) => updateSimulation("seed", Number(event.target.value) || 1)} /></label>
                  <Button onClick={applySimulation}><Play size={16} /> Chạy mô phỏng</Button>
                </div>

                <div className="simulation-kpis">
                  <article><span>DSCR P5</span><strong>{fmt(simulation.p5, "x")}</strong><small>Downside tail</small></article>
                  <article><span>DSCR P50</span><strong>{fmt(simulation.p50, "x")}</strong><small>Median path</small></article>
                  <article className="amber"><span>P(DSCR &lt; 1.20x)</span><strong>{percent.format(simulation.probabilityBreach)}</strong><small>Covenant breach</small></article>
                  <article className="brick"><span>P(DSCR &lt; 1.00x)</span><strong>{percent.format(simulation.probabilityDefaultIndicator)}</strong><small>Cash-flow default indicator</small></article>
                  <article><span>Carbon VaR95</span><strong>€{money.format(simulation.carbonVar95)}k</strong><small>Cash burden P95</small></article>
                </div>

                <div className="simulation-grid">
                  <article className="chart-panel histogram-panel">
                    <div className="panel-heading"><div><span className="section-index">DISTRIBUTION</span><h3>Phân phối DSCR sau carbon</h3></div><span className="unit-tag">SHARE OF PATHS</span></div>
                    <div className="distribution-zones"><span>Stress &lt;1.00x</span><span>Watch 1.00–1.20x</span><span>Pass ≥1.20x</span></div>
                    <div className="chart-wrap compact">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={simulation.histogram} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 6" stroke="#d9ddd8" vertical={false} />
                          <XAxis dataKey="midpoint" tickFormatter={(value) => Number(value).toFixed(2)} tickLine={false} axisLine={false} tick={{ fill: "#6a746f", fontSize: 10 }} />
                          <YAxis tickFormatter={(value) => percent.format(Number(value))} tickLine={false} axisLine={false} tick={{ fill: "#6a746f", fontSize: 10 }} />
                          <ChartTooltip formatter={(value) => percent.format(Number(value))} labelFormatter={(value) => `DSCR midpoint ${Number(value).toFixed(2)}x`} contentStyle={{ border: "1px solid #d8ddd8", borderRadius: 4, fontSize: 11 }} />
                          <Bar dataKey="share" name="Tỷ trọng paths" fill="#16877e" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  {/* FIX (audit): entity dual-shock (vừa CBAM vừa domestic) nay hiện ĐỦ 2 ma trận
                      thay vì chỉ 1, để không che khuất độ nhạy phía nội địa. */}
                  {sensitivity.map((matrix) => (
                    <article className="heatmap-panel" key={matrix.mode}>
                      <div className="panel-heading"><div><span className="section-index">SENSITIVITY MATRIX</span><h3>{matrix.title}</h3></div><span className="unit-tag">P(BREACH)</span></div>
                      <p className="heatmap-caption">Hàng: {matrix.rowLabel} · Cột: {matrix.columnLabel}. Mỗi ô dùng cùng seed để so sánh nhất quán.</p>
                      <div className="heatmap-grid" style={{ gridTemplateColumns: `88px repeat(${matrix.columns.length}, minmax(48px,1fr))` }}>
                        <div className="heat-corner">{matrix.mode === "cbam" ? "α / η" : "Δalloc / η"}</div>
                        {matrix.columns.map((column) => <div className="heat-axis" key={`c-${matrix.mode}-${column}`}>{percent.format(column)}</div>)}
                        {matrix.rows.flatMap((row, rowIndex) => [
                          <div className="heat-axis row-axis" key={`r-${matrix.mode}-${row}`}>{percent.format(row)}</div>,
                          ...matrix.values[rowIndex].map((value, columnIndex) => (
                            <div className="heat-cell" style={heatStyle(value)} key={`${matrix.mode}-${row}-${matrix.columns[columnIndex]}`}><strong>{percent.format(value)}</strong><span>{value < .25 ? "Low" : value < .65 ? "Watch" : "High"}</span></div>
                          )),
                        ])}
                      </div>
                      <div className="heat-legend"><span>Lower breach risk</span><i /><i /><i /><span>Higher breach risk</span></div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
        ) : (
          <section className="empty-state">
            <div><span className="section-index">03 / OUTPUT</span><h2>Kết quả sẽ xuất hiện ở đây</h2><p>Tải tệp hoặc dùng dữ liệu minh họa để kiểm tra toàn bộ luồng tính. Mọi giá trị minh họa đều được ghi rõ và không đại diện cho doanh nghiệp thật.</p></div>
            <div className="empty-sequence"><span>EMISSIONS</span><i /><span>LIABILITY</span><i /><span>CFADS</span><i /><span>DSCR</span></div>
          </section>
        )}
      </main>

      {schemaOpen && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSchemaOpen(false); }}>
          <aside className="schema-drawer" role="dialog" aria-modal="true" aria-labelledby="schema-title">
            <div className="drawer-head"><div><span className="section-index">DATA CONTRACT</span><h2 id="schema-title">Schema đầu vào · {FIELD_DEFINITIONS.length} trường</h2></div><button className="icon-button" onClick={() => setSchemaOpen(false)} aria-label="Đóng"><X size={20} /></button></div>
            <p className="drawer-intro">Tạo worksheet <code>Inputs</code>, mỗi dòng là một doanh nghiệp–năm. Tên trường không phân biệt hoa thường; các alias phổ biến như <code>company</code>, <code>ebitda</code> và <code>debt_service</code> được nhận diện tự động.</p>
            <div className="schema-list">
              {FIELD_DEFINITIONS.map(([field, description, unit], index) => (
                <div key={field}><span>{String(index + 1).padStart(2, "0")}</span><code>{field}</code><p>{description}</p><small>{unit}</small></div>
              ))}
            </div>
            <div className="drawer-actions"><Button onClick={exportInputWorkbook}><FileSpreadsheet size={16} /> Excel template</Button><Button variant="outline" onClick={exportInputJson}><FileJson size={16} /> JSON template</Button><Button variant="ghost" onClick={() => setSchemaOpen(false)}>Đã hiểu</Button></div>
          </aside>
        </div>
      )}
    </div>
  );
}
