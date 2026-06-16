import type { ChatMessage } from "@/routes/index";
import type { QueryResponse } from "@/lib/api";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findQuestionFor(messages: ChatMessage[], idx: number): string {
  for (let i = idx - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user" && m.text) return m.text;
  }
  return "Untitled query";
}

function renderTable(r: QueryResponse): string {
  const rows = r.results.slice(0, 200);
  const head = r.columns
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${r.columns
          .map((c) => {
            const v = row[c];
            const val =
              v === null || v === undefined
                ? "—"
                : typeof v === "number"
                  ? v.toLocaleString()
                  : escapeHtml(String(v));
            return `<td>${val}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const more =
    r.results.length > rows.length
      ? `<p class="muted">… +${(r.results.length - rows.length).toLocaleString()} more rows</p>`
      : "";
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${more}`;
}

function renderChart(id: string, r: QueryResponse): string {
  if (!r.chart || !r.chart.data?.length) return "";
  const labels = r.chart.data.map((d) => d[r.chart!.x_key]);
  const values = r.chart.data.map((d) => Number(d[r.chart!.y_key]) || 0);
  const type =
    r.chart.type === "pie"
      ? "pie"
      : r.chart.type === "line"
        ? "line"
        : "bar";
  const palette = [
    "#6366F1",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#EC4899",
  ];
  const bg =
    type === "pie"
      ? labels.map((_, i) => palette[i % palette.length])
      : "#6366F1";
  const config = {
    type,
    data: {
      labels,
      datasets: [
        {
          label: r.chart.y_key,
          data: values,
          backgroundColor: bg,
          borderColor: type === "line" ? "#8B5CF6" : undefined,
          borderWidth: type === "line" ? 2 : 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" },
          display: type === "pie",
        },
      },
      scales:
        type === "pie"
          ? undefined
          : {
              x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
              y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
            },
    },
  };
  return `<div class="chart-wrap"><canvas id="${id}"></canvas></div>
<script>new Chart(document.getElementById(${JSON.stringify(id)}), ${JSON.stringify(config)});</script>`;
}

function renderQuery(
  messages: ChatMessage[],
  m: ChatMessage,
  idx: number,
  n: number,
): string {
  const r = m.response!;
  const question = findQuestionFor(messages, idx);
  const chartId = `chart-${n}`;
  return `
<section class="query">
  <div class="query-head">
    <span class="badge">Query ${n}</span>
    <span class="badge badge-${r.confidence.toLowerCase()}">${escapeHtml(r.confidence)}</span>
    ${r.cached ? '<span class="badge badge-cached">Cached</span>' : ""}
  </div>
  <h2>${escapeHtml(question)}</h2>
  ${r.narrative ? `<div class="narrative">${escapeHtml(r.narrative)}</div>` : ""}
  ${renderChart(chartId, r)}
  <details class="sql">
    <summary>Generated SQL</summary>
    <pre><code>${escapeHtml(r.sql)}</code></pre>
  </details>
  <div class="results-head">
    <strong>Results</strong>
    <span class="muted">${r.total_rows.toLocaleString()} rows · ${r.columns.length} cols</span>
  </div>
  ${renderTable(r)}
  ${
    r.anomalies.length
      ? `<div class="anomalies"><strong>⚠ Anomalies</strong><ul>${r.anomalies
          .map((a) => `<li>${escapeHtml(a)}</li>`)
          .join("")}</ul></div>`
      : ""
  }
</section>`;
}

function buildHtml(messages: ChatMessage[]): string {
  const completed = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.role === "assistant" && m.response);
  const date = new Date().toLocaleString();
  const sections = completed
    .map(({ m, i }, idx) => renderQuery(messages, m, i, idx + 1))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QueryMind Report — ${date}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    background: #0b0f1a;
    color: #e2e8f0;
    margin: 0;
    padding: 0;
    line-height: 1.55;
  }
  .container { max-width: 960px; margin: 0 auto; padding: 48px 32px 80px; }
  header.brand {
    border-bottom: 1px solid #1e293b;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  header.brand h1 {
    margin: 0 0 6px;
    font-size: 32px;
    background: linear-gradient(90deg, #818cf8, #c4b5fd);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: -0.02em;
  }
  header.brand p { margin: 0; color: #94a3b8; font-size: 14px; }
  section.query {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 28px;
    box-shadow: 0 8px 24px -16px rgba(0,0,0,0.6);
  }
  section.query h2 {
    margin: 8px 0 12px;
    font-size: 20px;
    color: #f1f5f9;
    letter-spacing: -0.01em;
  }
  .query-head { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: #1e293b;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge-high { background: rgba(16,185,129,0.15); color: #34d399; }
  .badge-medium { background: rgba(245,158,11,0.15); color: #fbbf24; }
  .badge-low { background: rgba(239,68,68,0.15); color: #f87171; }
  .badge-cached { background: rgba(99,102,241,0.15); color: #a5b4fc; }
  .narrative {
    border-left: 3px solid #6366f1;
    background: rgba(99,102,241,0.08);
    padding: 12px 14px;
    border-radius: 8px;
    margin: 12px 0 16px;
    color: #e2e8f0;
    font-size: 14px;
  }
  .chart-wrap {
    background: #0b1220;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 16px;
    height: 320px;
    margin: 16px 0;
  }
  details.sql {
    background: #0b1220;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 10px 14px;
    margin: 12px 0;
  }
  details.sql summary {
    cursor: pointer;
    font-weight: 600;
    color: #a5b4fc;
    font-size: 13px;
  }
  details.sql pre {
    background: #020617;
    border-radius: 8px;
    padding: 12px;
    overflow-x: auto;
    color: #e2e8f0;
    font-size: 12px;
    margin: 10px 0 0;
  }
  .results-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 18px 0 8px;
  }
  .muted { color: #64748b; font-size: 12px; }
  .table-wrap {
    border: 1px solid #1e293b;
    border-radius: 10px;
    overflow: auto;
    max-height: 480px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th {
    position: sticky; top: 0;
    background: #0f172a;
    color: #94a3b8;
    text-align: left;
    padding: 8px 12px;
    font-weight: 600;
    border-bottom: 1px solid #1e293b;
  }
  tbody td {
    padding: 7px 12px;
    border-bottom: 1px solid #1e293b;
    color: #e2e8f0;
  }
  tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
  .anomalies {
    margin-top: 16px;
    background: rgba(245,158,11,0.08);
    border-left: 3px solid #f59e0b;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #fde68a;
  }
  .anomalies ul { margin: 6px 0 0; padding-left: 18px; }
  footer.brand-foot {
    margin-top: 48px;
    padding-top: 18px;
    border-top: 1px solid #1e293b;
    text-align: center;
    color: #64748b;
    font-size: 12px;
  }
</style>
</head>
<body>
<div class="container">
  <header class="brand">
    <h1>QueryMind Report</h1>
    <p>Generated: ${escapeHtml(date)} · ${completed.length} ${completed.length === 1 ? "query" : "queries"}</p>
  </header>
  ${sections || '<p class="muted">No completed queries.</p>'}
  <footer class="brand-foot">Powered by Groq + DuckDB</footer>
</div>
</body>
</html>`;
}

export function downloadReport(messages: ChatMessage[]): void {
  const html = buildHtml(messages);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  a.href = url;
  a.download = `querymind-report-${ts}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
