import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  Database,
  FileSpreadsheet,
  ChevronDown,
  X,
  MessageSquare,
  Trash2,
  Sparkles,
} from "lucide-react";
import { uploadCsv, type UploadResponse, type HistoryItem } from "@/lib/api";

interface SidebarProps {
  sessionId: string;
  tables: UploadResponse[];
  onUploaded: (res: UploadResponse) => void;
  onClear: (tableName: string) => void;
  history: HistoryItem[];
  onPickHistory: (question: string) => void;
  onClearHistory: () => void;
  open?: boolean;
  onClose?: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

function chipClassesForType(rawType: string): string {
  const t = rawType.toUpperCase();
  if (/(INT|BIGINT|NUMBER|SMALLINT|TINYINT)/.test(t))
    return "bg-primary-soft text-primary";
  if (/(FLOAT|DOUBLE|DECIMAL|REAL|NUMERIC)/.test(t))
    return "bg-emerald-50 text-emerald-700";
  if (/(DATE|TIME|TIMESTAMP)/.test(t))
    return "bg-violet-50 text-violet-700";
  return "bg-muted text-text-muted";
}

const sectionVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export function Sidebar({
  sessionId,
  tables,
  onUploaded,
  onClear,
  history,
  onPickHistory,
  onClearHistory,
  open = false,
  onClose,
}: SidebarProps) {
  const hasData = tables.length > 0;

  const content = (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-surface">
      <SessionStatusBar hasData={hasData} onClose={onClose} />
      <motion.div custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
        <LogoHeader />
      </motion.div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <motion.div custom={1} initial="hidden" animate="visible" variants={sectionVariants}>
          <DataSourcesSection
            sessionId={sessionId}
            tables={tables}
            onUploaded={onUploaded}
            onClear={onClear}
          />
        </motion.div>
        <motion.div custom={2} initial="hidden" animate="visible" variants={sectionVariants}>
          <HistorySection
            history={history}
            onPick={onPickHistory}
            onClearHistory={onClearHistory}
          />
        </motion.div>
      </div>

      <div className="border-t border-border px-5 py-2.5 text-[11px] text-text-subtle">
        Session{" "}
        <span className="font-mono text-text-muted">
          {sessionId ? sessionId.slice(0, 8) : "—"}
        </span>
      </div>
      <div className="border-t border-border bg-background/50 px-5 py-2.5 text-center text-[10px] font-medium uppercase tracking-wider text-text-subtle">
        Powered by{" "}
        <span className="text-text-muted">Groq</span> +{" "}
        <span className="text-text-muted">DuckDB</span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop static */}
      <div className="hidden lg:flex">{content}</div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SessionStatusBar({
  hasData,
  onClose,
}: {
  hasData: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-background/60 px-5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium">
        <span
          className={`relative h-1.5 w-1.5 rounded-full ${hasData ? "bg-success" : "bg-text-subtle"}`}
        >
          {hasData && (
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
          )}
        </span>
        <span className={hasData ? "text-success" : "text-text-muted"}>
          {hasData ? "Session Active" : "No Data"}
        </span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="grid h-6 w-6 place-items-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text-primary lg:hidden"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function LogoHeader() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <motion.div
        initial={{ rotate: -10, scale: 0.9, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand shadow-[0_8px_24px_-8px_rgb(99_102_241/0.6)]"
      >
        <Database className="h-4 w-4 text-white" strokeWidth={2.4} />
        <Sparkles
          className="absolute -right-1 -top-1 h-3.5 w-3.5 text-warning"
          strokeWidth={2.5}
          fill="currentColor"
        />
      </motion.div>
      <div className="flex items-baseline text-[20px] font-semibold tracking-tight">
        <span style={{ color: "#6366F1" }}>Query</span>
        <span style={{ color: "#8B5CF6" }}>Mind</span>
      </div>
    </div>
  );
}

function DataSourcesSection({
  sessionId,
  tables,
  onUploaded,
  onClear,
}: Pick<SidebarProps, "sessionId" | "tables" | "onUploaded" | "onClear">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large (max 10MB)");
      return;
    }
    try {
      setUploading(true);
      const res = await uploadCsv(file, sessionId);
      onUploaded(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="mb-5 pt-2">
      <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Data Sources
      </h3>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        disabled={uploading}
        className={[
          "group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary-soft"
            : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40",
          uploading ? "cursor-wait opacity-80" : "cursor-pointer",
        ].join(" ")}
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-medium text-text-primary">Uploading…</span>
          </>
        ) : (
          <>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
              <Upload className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-text-primary">
              Drop CSV or click to upload
            </span>
            <span className="text-[11px] text-text-subtle">Max 10MB</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </button>

      {error && (
        <p className="mt-2 px-1 text-[11px] text-danger">{error}</p>
      )}

      <div className="mt-3 space-y-2">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-background/60 px-3 py-4 text-center">
            <Database className="h-4 w-4 text-text-subtle" />
            <p className="text-[11px] leading-snug text-text-subtle">
              No data source — upload a CSV to begin
            </p>
          </div>
        ) : (
          tables.map((t) => (
            <DatasetCard
              key={t.table_name}
              table={t}
              onRemove={() => onClear(t.table_name)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DatasetCard({
  table,
  onRemove,
}: {
  table: UploadResponse;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const colCount = Object.keys(table.columns).length;

  return (
    <div className="overflow-hidden rounded-xl border border-border border-l-[3px] border-l-success bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-50 text-success">
          <FileSpreadsheet className="h-3.5 w-3.5" />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-xs font-semibold text-text-primary">
            {table.table_name}
          </div>
          <div className="mt-0.5 text-[11px] text-text-muted">
            {table.row_count.toLocaleString()} rows · {colCount} cols
          </div>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse" : "Expand"}
          className="grid h-6 w-6 place-items-center rounded-md text-text-subtle transition-colors hover:bg-muted hover:text-text-primary"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove dataset"
          className="grid h-6 w-6 place-items-center rounded-md text-text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-background/60"
          >
            <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
              {Object.entries(table.columns).map(([name, type]) => (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${chipClassesForType(type)}`}
                >
                  <span className="text-text-primary/90">{name}</span>
                  <span className="opacity-70">·</span>
                  <span className="uppercase tracking-wide">{type}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistorySection({
  history,
  onPick,
  onClearHistory,
}: {
  history: HistoryItem[];
  onPick: (q: string) => void;
  onClearHistory: () => void;
}) {
  return (
    <section className="mb-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Recent Questions
        </h3>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            aria-label="Clear history"
            className="grid h-5 w-5 place-items-center rounded-md text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-text-subtle">
          Your query history will appear here
        </div>
      ) : (
        <ul className="space-y-0.5">
          {history.map((h, i) => (
            <li key={`${i}-${h.question}`}>
              <button
                type="button"
                onClick={() => onPick(h.question)}
                className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-text-subtle group-hover:text-primary" />
                <span className="truncate">{h.question}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
