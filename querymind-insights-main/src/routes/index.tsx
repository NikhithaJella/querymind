import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSessionId,
  clearHistory as apiClearHistory,
  runQuery,
  type DataProfile,
  type UploadResponse,
  type HistoryItem,
  type QueryResponse,
} from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { InsightsPanel } from "@/components/InsightsPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QueryMind — Ask your data anything" },
      {
        name: "description",
        content:
          "Upload CSVs and ask natural-language questions. QueryMind returns SQL, charts, and AI-powered insights.",
      },
      { property: "og:title", content: "QueryMind — Ask your data anything" },
      {
        property: "og:description",
        content:
          "Upload CSVs and ask natural-language questions. QueryMind returns SQL, charts, and AI-powered insights.",
      },
    ],
  }),
  component: QueryMindApp,
});

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  response?: QueryResponse;
  pending?: boolean;
  loadingSteps?: string[];
  loadingStepIndex?: number;
  error?: string;
  passport?: { profile: DataProfile; tableName: string };
}

const DEFAULT_LOADING_STEPS = [
  "Understanding your question…",
  "Inspecting the data schema…",
  "Generating SQL query…",
  "Running query against your data…",
  "Analyzing results…",
  "Composing AI insights…",
];

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function QueryMindApp() {
  const [sessionId, setSessionId] = useState<string>("");
  const [tables, setTables] = useState<UploadResponse[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [latestResponse, setLatestResponse] = useState<QueryResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  function handleUploaded(res: UploadResponse) {
    setTables((prev) => {
      const next = prev.filter((t) => t.table_name !== res.table_name);
      return [...next, res];
    });
    if (res.profile) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          passport: { profile: res.profile!, tableName: res.table_name },
        },
      ]);
    }
  }

  function handleClearTable(tableName: string) {
    setTables((prev) => prev.filter((t) => t.table_name !== tableName));
  }

  async function handleClearHistory() {
    setHistory([]);
    if (sessionId) {
      try {
        await apiClearHistory(sessionId);
      } catch {
        /* non-fatal */
      }
    }
  }

  const handleSubmit = useCallback(
    async (question: string) => {
      if (!sessionId || loading) return;
      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        text: question,
      };
      const pendingId = newId();
      const pendingMsg: ChatMessage = {
        id: pendingId,
        role: "assistant",
        pending: true,
        loadingSteps: DEFAULT_LOADING_STEPS,
        loadingStepIndex: 0,
      };
      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setInput("");
      setLoading(true);

      if (stepTimer.current) clearInterval(stepTimer.current);
      stepTimer.current = setInterval(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  loadingStepIndex: Math.min(
                    (m.loadingStepIndex ?? 0) + 1,
                    (m.loadingSteps?.length ?? 1) - 1,
                  ),
                }
              : m,
          ),
        );
      }, 600);

      try {
        const res = await runQuery(question, sessionId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { id: pendingId, role: "assistant", response: res }
              : m,
          ),
        );
        setLatestResponse(res);
        setInsightsOpen(true);
        setHistory((prev) => [
          { question, sql: res.sql, narrative: res.narrative },
          ...prev,
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Query failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { id: pendingId, role: "assistant", error: msg }
              : m,
          ),
        );
      } finally {
        if (stepTimer.current) {
          clearInterval(stepTimer.current);
          stepTimer.current = null;
        }
        setLoading(false);
      }
    },
    [sessionId, loading],
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-text-primary">
      <Sidebar
        sessionId={sessionId}
        tables={tables}
        onUploaded={handleUploaded}
        onClear={handleClearTable}
        history={history}
        onPickHistory={(q) => setInput(q)}
        onClearHistory={handleClearHistory}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatPanel
        messages={messages}
        loading={loading}
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        sessionId={sessionId}
        hasTables={tables.length > 0}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenInsights={() => setInsightsOpen(true)}
      />

      <InsightsPanel
        response={latestResponse}
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
      />
    </div>
  );
}
