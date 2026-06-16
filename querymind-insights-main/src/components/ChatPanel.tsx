import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  TrendingUp,
  BarChart3,
  Search,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Code,
  Copy,
  Check,
  Wand2,
  Globe,
  Zap,
  Loader2,
  AlertCircle,
  ArrowUp,
  CircleCheck,
  Hash,
  Type as TypeIcon,
  Calendar,
  FileDown,
  Menu,
  PanelRight,
  Upload,
} from "lucide-react";
import type { ChatMessage } from "@/routes/index";
import type { ColumnProfile } from "@/lib/api";
import { downloadReport } from "@/lib/report";

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  sessionId: string;
  hasTables: boolean;
  onOpenSidebar: () => void;
  onOpenInsights: () => void;
}

export function ChatPanel({
  messages,
  loading,
  input,
  onChange,
  onSubmit,
  sessionId: _sessionId,
  hasTables,
  onOpenSidebar,
  onOpenInsights,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  const hasResponses = messages.some((m) => m.role === "assistant" && m.response);

  function guardedChange(v: string) {
    if (v && !hasTables) {
      toast("Please upload a CSV file first", {
        icon: <Upload className="h-4 w-4 text-primary" />,
      });
      return;
    }
    onChange(v);
  }

  function trySubmit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (!hasTables) {
      toast("Please upload a CSV file first", {
        icon: <Upload className="h-4 w-4 text-primary" />,
      });
      return;
    }
    onSubmit(trimmed);
  }

  function handlePick(q: string) {
    if (!hasTables) {
      toast("Please upload a CSV file first", {
        icon: <Upload className="h-4 w-4 text-primary" />,
      });
      return;
    }
    onSubmit(q);
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-primary/40 hover:text-primary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              Conversation
            </h1>
            <p className="hidden text-xs text-text-muted sm:block">
              Ask anything about your data — SQL, charts and insights in seconds.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasResponses && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              type="button"
              onClick={() => downloadReport(messages)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download Report</span>
            </motion.button>
          )}
          <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Connected
          </div>
          <button
            type="button"
            onClick={onOpenInsights}
            aria-label="Open insights"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-primary/40 hover:text-primary xl:hidden"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        {messages.length === 0 ? (
          <EmptyState onPick={handlePick} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} onSubmit={handlePick} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-surface px-4 py-4 shadow-[0_-1px_2px_0_rgb(15_23_42/0.03)] sm:px-6">
        <div
          className={`mx-auto flex max-w-3xl items-end gap-2 rounded-xl border bg-surface px-3 py-2 shadow-[var(--shadow-card)] transition-shadow focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 ${
            loading
              ? "border-primary/50 animate-pulse ring-2 ring-primary/20"
              : "border-border"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => guardedChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                trySubmit();
              }
            }}
            rows={1}
            disabled={loading}
            placeholder={
              loading
                ? "Thinking…"
                : "Ask anything about your data — sales trends, anomalies, top performers…"
            }
            className="max-h-36 min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-sm text-text-primary placeholder:text-text-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={trySubmit}
            disabled={loading || !input.trim()}
            className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-white shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_rgb(99_102_241/0.6)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-text-subtle">
          Enter to send · Shift+Enter for newline · Connected to localhost:8000
        </p>
      </div>
    </main>
  );
}

// empty state suggestions

const SUGGESTIONS: Array<{ q: string; icon: typeof TrendingUp; tint: string }> = [
  { q: "Which items generate the most revenue?", icon: TrendingUp, tint: "text-primary bg-primary-soft" },
  { q: "Show me top 10 rows", icon: BarChart3, tint: "text-violet-700 bg-violet-50" },
  { q: "What's the sales trend over time?", icon: Search, tint: "text-emerald-700 bg-emerald-50" },
  { q: "Are there any anomalies in this data?", icon: AlertTriangle, tint: "text-warning bg-amber-50" },
];

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-gradient-brand text-4xl font-semibold tracking-tight sm:text-5xl"
      >
        Ask your data anything
      </motion.h2>
      <p className="mt-3 max-w-md text-sm text-text-muted">
        Upload a CSV, ask a question in plain English — get SQL, charts &amp; AI
        insights instantly.
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.q}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i + 0.1, duration: 0.35 }}
            whileHover={{ y: -2 }}
            onClick={() => onPick(s.q)}
            className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-primary/30 hover:bg-primary-soft/40"
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${s.tint}`}>
              <s.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-text-primary group-hover:text-primary">
              {s.q}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  onSubmit,
}: {
  message: ChatMessage;
  onSubmit: (q: string) => void;
}) {
  if (message.role === "user") return <UserBubble text={message.text ?? ""} />;
  if (message.error) return <ErrorBubble error={message.error} />;
  if (message.passport)
    return (
      <DataPassportCard
        tableName={message.passport.tableName}
        profile={message.passport.profile}
        onPick={onSubmit}
      />
    );
  if (message.pending) return <PendingBubble message={message} />;
  if (message.response)
    return <AssistantBubble message={message} onPick={onSubmit} />;
  return null;
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-brand px-4 py-2.5 text-sm leading-relaxed text-white shadow-md">
        {text}
      </div>
    </motion.div>
  );
}

function ErrorBubble({ error }: { error: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-[92%] items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">Something went wrong</div>
        <div className="mt-0.5 text-xs opacity-90">{error}</div>
      </div>
    </motion.div>
  );
}

// data passport card shown after upload

function healthTone(score: number) {
  if (score >= 95) return { text: "text-success", bar: "bg-success" };
  if (score >= 80) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-danger", bar: "bg-danger" };
}

function DataPassportCard({
  tableName,
  profile,
  onPick,
}: {
  tableName: string;
  profile: import("@/lib/api").DataProfile;
  onPick: (q: string) => void;
}) {
  const tone = healthTone(profile.health_score);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="max-w-[92%] rounded-xl border border-border border-l-[4px] border-l-primary bg-surface shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Data Passport
            </div>
            <div className="text-[11px] text-text-muted">{tableName}</div>
          </div>
        </div>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          {profile.dataset_type}
        </span>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Health */}
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-text-muted">
            <span>Health Score</span>
            <span className={`text-sm font-semibold ${tone.text}`}>
              {profile.health_score}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${profile.health_score}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full ${tone.bar}`}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <StatBadge label="Rows" value={profile.row_count.toLocaleString()} />
          <StatBadge label="Columns" value={profile.col_count.toString()} />
        </div>

        {/* Column insights */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Column Insights
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {profile.columns.slice(0, 6).map((c) => (
              <ColumnInsight key={c.name} col={c} />
            ))}
          </ul>
          {profile.columns.length > 6 && (
            <div className="mt-1.5 text-[11px] text-text-subtle">
              +{profile.columns.length - 6} more columns
            </div>
          )}
        </div>

        {/* Suggested questions */}
        {profile.suggested_questions.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <Sparkles className="h-3 w-3 text-warning" />
              AI Suggested Questions
            </div>
            <div className="space-y-1.5">
              {profile.suggested_questions.slice(0, 5).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onPick(q)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-text-primary transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function ColumnInsight({ col }: { col: ColumnProfile }) {
  const t = col.type.toUpperCase();
  const isNum = /(INT|FLOAT|DOUBLE|DECIMAL|NUMBER|REAL|NUMERIC)/.test(t);
  const isDate = /(DATE|TIME|TIMESTAMP)/.test(t);
  const Icon = isNum ? Hash : isDate ? Calendar : TypeIcon;
  let stat = "";
  if (isNum && col.avg !== undefined)
    stat = `avg ${Number(col.avg).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  else if (isDate && col.date_min && col.date_max)
    stat = `${col.date_min} → ${col.date_max}`;
  else if (col.unique_count !== undefined)
    stat = `${col.unique_count.toLocaleString()} unique`;

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-text-subtle" />
        <span className="truncate font-medium text-text-primary">{col.name}</span>
        <span className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase text-text-muted">
          {col.type}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-text-muted">
        {stat && <span>{stat}</span>}
        {col.null_pct > 0 && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
            {col.null_pct.toFixed(1)}% null
          </span>
        )}
      </div>
    </li>
  );
}

function PendingBubble({ message }: { message: ChatMessage }) {
  const steps = message.loadingSteps ?? [];
  const idx = message.loadingStepIndex ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[92%] rounded-xl border border-border bg-surface px-5 py-4 shadow-[var(--shadow-card)]"
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Thinking…
      </div>
      <ThinkingTimeline steps={steps.slice(0, idx + 1)} activeIndex={idx} pending />
    </motion.div>
  );
}

function ThinkingTimeline({
  steps,
  activeIndex,
  pending,
}: {
  steps: string[];
  activeIndex: number;
  pending: boolean;
}) {
  return (
    <ol className="relative space-y-2.5 pl-5">
      <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-primary/20" />
      {steps.map((s, i) => {
        const isActive = pending && i === activeIndex;
        const done = !pending || i < activeIndex;
        return (
          <li key={`${i}-${s}`} className="relative text-xs text-text-muted">
            <span className="absolute -left-5 top-0.5 grid h-3.5 w-3.5 place-items-center">
              {isActive ? (
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : done ? (
                <CircleCheck className="h-3.5 w-3.5 text-success" />
              ) : (
                <span className="block h-2 w-2 rounded-full bg-primary/40" />
              )}
            </span>
            <span className={done && !isActive ? "text-text-primary" : ""}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

function confidenceTone(c: string) {
  if (c === "High") return "bg-emerald-50 text-success border-success/30";
  if (c === "Medium") return "bg-amber-50 text-warning border-warning/30";
  return "bg-red-50 text-danger border-danger/30";
}

function AssistantBubble({
  message,
  onPick,
}: {
  message: ChatMessage;
  onPick: (q: string) => void;
}) {
  const r = message.response!;
  const [sqlOpen, setSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copySql() {
    try {
      await navigator.clipboard.writeText(r.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="max-w-[92%] space-y-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${confidenceTone(r.confidence)}`}
        >
          <Zap className="h-3 w-3" /> {r.confidence}
        </span>
        {r.cached && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-warning">
            Cached
          </span>
        )}
        {r.web_context_used && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
            <Globe className="h-3 w-3" /> Web Enriched
          </span>
        )}
        {r.retry_history.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-warning">
            <Wand2 className="h-3 w-3" /> Self-healed · {r.retry_history.length}{" "}
            {r.retry_history.length === 1 ? "retry" : "retries"}
          </span>
        )}
        {r.used_golden_query && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
            Golden Query
          </span>
        )}
      </div>

      {/* Thinking steps */}
      {r.thinking_steps.length > 0 && (
        <ThinkingTimeline
          steps={r.thinking_steps}
          activeIndex={r.thinking_steps.length}
          pending={false}
        />
      )}

      {/* Narrative */}
      {r.narrative && (
        <div className="rounded-lg border border-primary/15 bg-primary-soft px-3.5 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> AI Analysis
          </div>
          <p className="text-sm leading-relaxed text-text-primary">
            {r.narrative}
          </p>
        </div>
      )}

      {/* SQL */}
      <div className="overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setSqlOpen((v) => !v)}
          className="flex w-full items-center justify-between bg-background px-3 py-2 text-xs font-semibold text-text-primary hover:bg-muted"
        >
          <span className="inline-flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5 text-primary" /> Generated SQL
          </span>
          <span className="text-[11px] font-normal text-text-muted">
            {sqlOpen ? "Hide" : "Show"}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {sqlOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative overflow-hidden"
            >
              <button
                type="button"
                onClick={copySql}
                className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <pre
                className="overflow-x-auto px-4 py-3 text-[12px] leading-relaxed text-slate-100"
                style={{ background: "#1E1E2E", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                {r.sql}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Follow-up suggestions */}
      {r.suggestions.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Continue exploring
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPick(s)}
                className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-text-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
