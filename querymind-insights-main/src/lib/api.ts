const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface ColumnProfile {
  name: string;
  type: string;
  null_pct: number;
  min?: number;
  max?: number;
  avg?: number;
  unique_count?: number;
  date_min?: string;
  date_max?: string;
}

export interface DataProfile {
  dataset_type: string;
  health_score: number;
  row_count: number;
  col_count: number;
  columns: ColumnProfile[];
  suggested_questions: string[];
}

export interface UploadResponse {
  status: string;
  table_name: string;
  row_count: number;
  columns: Record<string, string>;
  session_tables: string[];
  message: string;
  profile?: DataProfile;
}

export interface ChartSpec {
  type: "bar" | "line" | "pie" | string;
  x_key: string;
  y_key: string;
  data: Array<Record<string, any>>;
}

export interface QueryResponse {
  sql: string;
  columns: string[];
  results: Array<Record<string, any>>;
  total_rows: number;
  confidence: "High" | "Medium" | "Low" | string;
  used_golden_query: boolean;
  retry_history: Array<{ sql: string; error: string }>;
  web_context_used: boolean;
  chart: ChartSpec | null;
  narrative: string;
  suggestions: string[];
  anomalies: string[];
  thinking_steps: string[];
  cached: boolean;
}

export interface HistoryItem {
  question: string;
  sql: string;
  narrative: string;
}

const SESSION_KEY = "querymind_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadCsv(file: File, sessionId: string): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("session_id", sessionId);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  return handle<UploadResponse>(res);
}

export async function runQuery(question: string, sessionId: string): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id: sessionId }),
  });
  return handle<QueryResponse>(res);
}

export async function getHistory(sessionId: string): Promise<HistoryItem[]> {
  const res = await fetch(
    `${API_BASE}/history?session_id=${encodeURIComponent(sessionId)}`,
  );
  return handle<HistoryItem[]>(res);
}

export async function clearHistory(sessionId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/history`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return handle<{ status: string }>(res);
}
