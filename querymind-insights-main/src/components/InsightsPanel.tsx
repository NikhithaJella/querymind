import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Download,
  Hash,
  Type as TypeIcon,
  Calendar,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Rows,
  Gauge,
  Repeat,
  Globe,
  Database,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QueryResponse } from "@/lib/api";

interface InsightsPanelProps {
  response: QueryResponse | null;
  open?: boolean;
  onClose?: () => void;
}

type Tab = "table" | "chart" | "insights";

export function InsightsPanel({ response, open = false, onClose }: InsightsPanelProps) {
  const [tab, setTab] = useState<Tab>("table");

  const content = (
    <aside className="flex h-full w-[380px] max-w-[90vw] shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Insights</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close insights"
            className="grid h-6 w-6 place-items-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text-primary xl:hidden"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!response ? (
        <EmptyInsights />
      ) : (
        <>
          <TabBar tab={tab} onChange={setTab} />
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "table" && <TableView response={response} />}
                {tab === "chart" && <ChartView response={response} />}
                {tab === "insights" && <InsightsView response={response} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </aside>
  );

  return (
    <>
      <div className="hidden xl:flex">{content}</div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="insights-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm xl:hidden"
            />
            <motion.div
              key="insights-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 xl:hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyInsights() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <BarChart3 className="h-6 w-6" />
      </div>
      <p className="text-sm text-text-muted">
        Run a query to see results, charts and AI analysis here.
      </p>
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "table", label: "Table" },
    { id: "chart", label: "Chart" },
    { id: "insights", label: "Insights" },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border px-3">
      {tabs.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative px-3 py-2.5 text-xs font-semibold transition-colors ${
              active ? "text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-brand"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function confidenceColor(c: string) {
  if (c === "High") return "bg-emerald-50 text-success";
  if (c === "Medium") return "bg-amber-50 text-warning";
  return "bg-red-50 text-danger";
}

function StatPills({ response }: { response: QueryResponse }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
        Showing {response.results.length} of {response.total_rows.toLocaleString()} rows
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted">
        {response.columns.length} cols
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceColor(response.confidence)}`}
      >
        {response.confidence}
      </span>
      {response.web_context_used && (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
          <Globe className="h-3 w-3" /> Web Enriched
        </span>
      )}
      {response.cached && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-warning">
          Cached
        </span>
      )}
    </div>
  );
}

function isNumericValue(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isDateLike(name: string) {
  return /date|time|timestamp/i.test(name);
}

function colTypeIcon(name: string, sample: unknown) {
  if (isDateLike(name)) return Calendar;
  if (isNumericValue(sample)) return Hash;
  return TypeIcon;
}

function downloadCsv(filename: string, columns: string[], rows: Array<Record<string, any>>) {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TableView({ response }: { response: QueryResponse }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <StatPills response={response} />
        <button
          type="button"
          onClick={() => downloadCsv("query_results.csv", response.columns, response.results)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-border">
                {response.columns.map((c) => {
                  const Icon = colTypeIcon(c, response.results[0]?.[c]);
                  return (
                    <th
                      key={c}
                      className="whitespace-nowrap px-3 py-2 text-left font-semibold text-text-primary"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3 w-3 text-text-subtle" />
                        {c}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {response.results.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-primary-soft/40"
                  style={i % 2 === 1 ? { backgroundColor: "#FAFAFE" } : undefined}
                >
                  {response.columns.map((c) => {
                    const v = row[c];
                    const num = isNumericValue(v);
                    return (
                      <td
                        key={c}
                        className={`whitespace-nowrap px-3 py-2 text-text-primary ${num ? "text-right tabular-nums" : ""}`}
                      >
                        {v === null || v === undefined
                          ? <span className="text-text-subtle">—</span>
                          : num
                          ? v.toLocaleString()
                          : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {response.results.length === 0 && (
                <tr>
                  <td colSpan={response.columns.length} className="px-3 py-6 text-center text-xs text-text-subtle">
                    No rows returned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// chart tab — bar/line/pie with client-side controls

type ChartType = "bar" | "line" | "pie";
type SortMode = "default" | "asc" | "desc";
type TopN = 5 | 10 | 20 | 0; // 0 = all

const PIE_COLORS = ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

function ChartView({ response }: { response: QueryResponse }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialType = (response.chart?.type as ChartType) ?? "bar";
  const [type, setType] = useState<ChartType>(
    ["bar", "line", "pie"].includes(initialType) ? initialType : "bar",
  );
  const [sort, setSort] = useState<SortMode>("default");
  const [topN, setTopN] = useState<TopN>(10);

  const chart = response.chart;

  const transformed = useMemo(() => {
    if (!chart) return [];
    let rows = [...chart.data];
    if (sort !== "default") {
      rows.sort((a, b) => {
        const av = Number(a[chart.y_key]) || 0;
        const bv = Number(b[chart.y_key]) || 0;
        return sort === "asc" ? av - bv : bv - av;
      });
    }
    if (topN !== 0) rows = rows.slice(0, topN);
    return rows;
  }, [chart, sort, topN]);

  if (!chart) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-6 py-12 text-center">
        <BarChart3 className="h-8 w-8 text-text-subtle" />
        <p className="text-xs text-text-muted">No chart for this query</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<ChartType>
          value={type}
          onChange={setType}
          options={[
            { v: "bar", label: <BarChart3 className="h-3.5 w-3.5" /> },
            { v: "line", label: <LineIcon className="h-3.5 w-3.5" /> },
            { v: "pie", label: <PieIcon className="h-3.5 w-3.5" /> },
          ]}
        />
        <SegmentedControl<SortMode>
          value={sort}
          onChange={setSort}
          options={[
            { v: "default", label: "Default" },
            { v: "asc", label: "↑" },
            { v: "desc", label: "↓" },
          ]}
        />
        <SegmentedControl<TopN>
          value={topN}
          onChange={setTopN}
          options={[
            { v: 5, label: "5" },
            { v: 10, label: "10" },
            { v: 20, label: "20" },
            { v: 0, label: "All" },
          ]}
        />
        <button
          type="button"
          onClick={() => downloadChartPng(containerRef.current)}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Download className="h-3 w-3" /> PNG
        </button>
      </div>

      <div
        ref={containerRef}
        className="rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={transformed} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="qm-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7F0" vertical={false} />
                <XAxis dataKey={chart.x_key} tick={{ fontSize: 10, fill: "#64748B" }} stroke="#E4E7F0" />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="#E4E7F0" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey={chart.y_key} fill="url(#qm-bar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : type === "line" ? (
              <LineChart data={transformed} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="qm-line" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7F0" vertical={false} />
                <XAxis dataKey={chart.x_key} tick={{ fontSize: 10, fill: "#64748B" }} stroke="#E4E7F0" />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="#E4E7F0" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey={chart.y_key}
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#8B5CF6" }}
                  activeDot={{ r: 5 }}
                  fill="url(#qm-line)"
                />
              </LineChart>
            ) : (
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={transformed}
                  dataKey={chart.y_key}
                  nameKey={chart.x_key}
                  innerRadius={50}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {transformed.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #E4E7F0",
  background: "#FFFFFF",
  boxShadow: "0 8px 24px -8px rgb(15 23 42 / 0.15)",
  fontSize: 12,
};

function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ v: T; label: React.ReactNode }>;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? "bg-surface text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function downloadChartPng(node: HTMLElement | null) {
  if (!node) return;
  const svg = node.querySelector("svg");
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = (svg as SVGSVGElement).clientWidth * 2;
    canvas.height = (svg as SVGSVGElement).clientHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "chart.png";
    a.click();
  };
  img.src = "data:image/svg+xml;base64," + svg64;
}

function InsightsView({ response }: { response: QueryResponse }) {
  return (
    <div className="space-y-4">
      {/* Narrative */}
      <div className="rounded-xl border border-primary/20 border-l-[4px] border-l-primary bg-primary-soft px-4 py-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Bot className="h-3.5 w-3.5" /> AI Narrative
        </div>
        <p className="text-sm leading-relaxed text-text-primary">
          {response.narrative || "No narrative provided."}
        </p>
      </div>

      {/* Anomalies */}
      {response.anomalies.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warning">
            <AlertTriangle className="h-3.5 w-3.5" /> Data Anomalies
          </div>
          <ul className="space-y-1.5">
            {response.anomalies.map((a, i) => (
              <li
                key={i}
                className="rounded-lg border border-amber-200 border-l-[3px] border-l-warning bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                {a}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> No anomalies detected
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Rows} label="Total rows" value={response.total_rows.toLocaleString()} />
        <StatCard icon={Gauge} label="Confidence" value={response.confidence} />
        <StatCard icon={Repeat} label="Retries" value={response.retry_history.length.toString()} />
        <StatCard icon={Layers} label="Columns" value={response.columns.length.toString()} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-base font-semibold text-text-primary">{value}</div>
    </div>
  );
}
