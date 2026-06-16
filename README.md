# QueryMind — Ask Your Data Anything

**Live Demo:** [https://querymind-iota.vercel.app](https://querymind-iota.vercel.app) &nbsp;|&nbsp; **Backend API:** [https://querymind-jh2e.onrender.com](https://querymind-jh2e.onrender.com/health)

QueryMind is an AI-powered Text-to-SQL analytics tool. Upload any CSV file, ask questions in plain English, and get SQL queries, interactive charts, and business insights — instantly. No SQL knowledge required.

---

## What It Does

1. **Upload a CSV** — drag and drop any spreadsheet data
2. **Get a Data Passport** — automatic profiling: row count, column stats, health score, AI-categorized dataset type, and 5 suggested questions tailored to your data
3. **Ask in plain English** — type any question about your data
4. **Get results instantly** — SQL is generated, executed, and explained with a business narrative, chart, and anomaly report

---

## Features

### Core
- **Natural Language to SQL** — Groq (llama-3.3-70b-versatile) translates plain English into DuckDB SQL
- **Self-Healing SQL** — if the generated SQL fails, an automatic retry loop feeds the error back to the LLM and corrects it (up to 3 attempts). Shows retry count and history in the UI
- **Multi-CSV Sessions** — upload multiple CSV files in one session and ask JOIN queries across them
- **Conversation Memory** — keeps the last 5 question/SQL turns in context so follow-up questions stay coherent
- **Query Cache** — identical questions are served instantly from an in-memory cache (no repeat API calls)

### Unique Features (not found in standard Text-to-SQL tools)
- **Data Passport** — on every upload, automatically computes per-column null percentage, min/max/avg for numerics, unique value counts for strings, date ranges, and an overall health score. Groq classifies the dataset type and generates 5 business questions specific to your data
- **Real-time Web RAG** — when your question mentions market trends, industry benchmarks, or external comparisons, Tavily fetches live web context that gets woven into the AI narrative
- **Anomaly Detection** — every query result is scanned using IQR-based statistical analysis. Outliers and high-null columns are automatically flagged with the row label, value, and z-score
- **Chart Controls** — switch between bar, line, and pie charts; sort ascending/descending; filter to top 5/10/20/all — all client-side, no re-query needed
- **HTML Report Export** — download a complete standalone HTML report of your session with embedded Chart.js charts. No internet required to open it
- **Thinking Timeline** — animated step-by-step progress indicator shows exactly what the AI is doing while processing your query

### Security
- All SQL is validated through sqlglot AST parsing before execution
- Only SELECT statements are permitted — DROP, DELETE, INSERT, UPDATE, etc. are blocked at the API level
- Regex fallback validation if AST parsing encounters dialect quirks

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI |
| SQL Engine | DuckDB (in-memory, per-session) |
| LLM | Groq — llama-3.3-70b-versatile |
| Web Search | Tavily |
| SQL Validation | sqlglot |
| Data Analysis | pandas |
| Server | Uvicorn |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Router | TanStack Router |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix primitives) |
| Charts | Recharts |
| Animations | Framer Motion |
| Toasts | Sonner |

---

## Project Structure

```
Text_to_SQL/
├── backend/
│   ├── main.py                  # FastAPI app — /upload, /query, /history endpoints
│   ├── db_duckdb.py             # DuckDB session manager — load CSV, execute queries
│   ├── cache.py                 # In-memory query cache (normalized exact match)
│   ├── security.py              # SQL validation — blocks non-SELECT statements
│   ├── agent/
│   │   ├── sql_agent.py         # Groq SQL generation with self-healing retry loop
│   │   └── memory.py            # Per-session conversation history (last 5 turns)
│   ├── insights/
│   │   ├── profiler.py          # Data Passport — column stats + Groq dataset classification
│   │   ├── narrative.py         # Groq business narrative + follow-up suggestions
│   │   ├── anomaly.py           # IQR-based outlier detection + null flagging
│   │   └── chart.py             # Auto chart type selection (bar/line/pie)
│   ├── retrieval/
│   │   └── web_rag.py           # Tavily real-time web context for market questions
│   ├── .env                     # API keys (not committed)
│   ├── .env.example             # Key template
│   ├── requirements.txt
│   └── venv/
└── querymind-insights-main/     # React frontend
    ├── src/
    │   ├── routes/index.tsx     # Main app — state orchestration
    │   ├── components/
    │   │   ├── ChatPanel.tsx    # Chat UI, Data Passport card, message bubbles
    │   │   ├── Sidebar.tsx      # CSV upload, dataset cards, query history
    │   │   └── InsightsPanel.tsx # Table / Chart / Insights tabs
    │   ├── lib/
    │   │   ├── api.ts           # All backend API calls
    │   │   └── report.ts        # HTML report generator with Chart.js
    │   └── styles.css           # Tailwind v4 theme (light mode, indigo/violet palette)
    └── package.json
```

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ (or Bun)
- API keys for: Groq, Tavily

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Text_to_SQL
```

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables

Create `backend/.env` with your API keys:

```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

- **Groq** (free): https://console.groq.com
- **Tavily** (free tier): https://app.tavily.com

### 4. Frontend setup

```bash
cd querymind-insights-main
npm install
```

---

## Running the App

### Start the backend

```bash
cd backend
venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`

### Start the frontend

```bash
cd querymind-insights-main
npm run dev
```

Frontend runs at: `http://localhost:5173` (or the port Vite assigns)

Open the frontend URL in your browser.

---

## Using QueryMind

### Step 1 — Upload a CSV
Drag and drop a CSV file onto the upload zone in the left sidebar, or click to browse. Supported: any `.csv` up to 10MB.

On upload you immediately see the **Data Passport**:
- Dataset type (e.g. "Retail Weekly Sales")
- Health score (based on null percentage across all columns)
- Per-column stats (nulls, min/max/avg, unique counts, date ranges)
- 5 AI-suggested questions tailored to your data — click any to run it instantly

### Step 2 — Ask a question
Type any question in the chat box and press Enter. Examples:
- "Which store had the highest weekly sales?"
- "Show me the top 10 products by revenue"
- "Are there any anomalies in the temperature data?"
- "What is the average salary by department?"
- "How does our revenue compare to industry growth trends?" *(triggers web search)*

### Step 3 — Explore results
The right panel shows three tabs:

**Table** — paginated query results with a CSV download button

**Chart** — interactive visualization with controls:
- Switch between Bar / Line / Pie
- Sort: Default / Ascending / Descending
- Filter: Top 5 / 10 / 20 / All
- Download chart as PNG

**Insights** — AI narrative, detected anomalies, confidence score, retry count

### Step 4 — Download a report
After running one or more queries, click **Download Report** in the top bar. You get a standalone `.html` file with all your queries, narratives, and charts embedded — shareable with no dependencies.

---

## API Reference

All endpoints are served at `http://localhost:8000`.

### `GET /health`
Returns `{"status": "ok"}`. Use to confirm the server is running.

### `POST /upload`
Upload a CSV file and get an instant Data Passport.

**Form data:**
- `file` — the CSV file
- `session_id` — string (auto-generated by frontend from localStorage)

**Response:**
```json
{
  "status": "uploaded",
  "table_name": "walmart",
  "row_count": 6435,
  "columns": {"Store": "INTEGER", "Date": "VARCHAR", "Weekly_Sales": "DOUBLE"},
  "session_tables": ["walmart"],
  "message": "Dataset 'walmart' loaded with 6435 rows.",
  "profile": {
    "dataset_type": "Retail Weekly Sales",
    "health_score": 98.4,
    "row_count": 6435,
    "col_count": 8,
    "columns": [...],
    "suggested_questions": ["Which store has the highest total sales?", ...]
  }
}
```

### `POST /query`
Run a natural language question against the uploaded data.

**Request body:**
```json
{
  "question": "Which store had the highest weekly sales?",
  "session_id": "your-session-id"
}
```

**Response:**
```json
{
  "sql": "SELECT Store, MAX(Weekly_Sales) AS max_sales FROM walmart GROUP BY Store ORDER BY max_sales DESC LIMIT 10",
  "columns": ["Store", "max_sales"],
  "results": [...],
  "total_rows": 45,
  "confidence": "High",
  "retry_history": [],
  "web_context_used": false,
  "chart": {"type": "bar", "x_key": "Store", "y_key": "max_sales", "data": [...]},
  "narrative": "Store 20 leads with peak weekly sales of $301,397...",
  "suggestions": ["Which month has the highest average sales?", "..."],
  "anomalies": ["📈 'Store 33' is an outlier in 'Weekly_Sales': 301,397 (3.2σ from mean 15,981)"],
  "thinking_steps": ["🔍 Semantic cache miss...", "📂 CSV session active...", "✅ SQL executed..."],
  "cached": false
}
```

### `GET /history?session_id=<id>`
Returns the last 5 question/SQL/narrative turns for a session.

### `DELETE /history`
Clears session history, DuckDB tables, and cache for a session.

**Request body:**
```json
{"session_id": "your-session-id"}
```

---

## How Self-Healing SQL Works

When Groq generates SQL that fails to execute on DuckDB:

1. The error message is captured
2. The failed SQL + error are appended to the next prompt as context
3. Groq is asked to correct it
4. This repeats up to 3 times
5. If all 3 attempts fail, the API returns a 422 with the last error
6. The UI shows a "Self-healed · N retries" badge on responses that needed correction

---

## How the Data Passport Works

On every CSV upload, the profiler:
1. Runs `DESCRIBE` on the DuckDB table to get column names and types
2. For each column: counts nulls, computes min/max/avg (numerics), unique count (strings), date range (dates)
3. Health score = `100 - average null percentage across all columns`
4. Sends the column list to Groq which returns a 2–4 word dataset type label and 5 business questions that use actual column names from the data

---

## How Anomaly Detection Works

After every query, the result set is analyzed by `insights/anomaly.py`:
- **Null flagging**: columns with >10% nulls are flagged with exact count and percentage
- **Outlier detection**: for numeric columns with ≥4 values, IQR (interquartile range) is computed. Values beyond Q1 − 1.5×IQR or Q3 + 1.5×IQR are outliers. The most extreme outlier is reported with its value, z-score, and the row label from the first non-numeric column
- Maximum 5 anomalies reported per query

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for SQL generation and narratives |
| `TAVILY_API_KEY` | Yes | Tavily API key for real-time web search |
| `GENERATION_MODEL` | No | Override the Groq model (default: `llama-3.3-70b-versatile`) |

---

## Limitations

- CSV files only (no Excel, JSON, Parquet)
- Maximum file size: 10MB per CSV
- DuckDB sessions are in-memory — data is lost when the backend restarts
- Query results capped at 100 rows returned (DuckDB processes the full dataset; only display is capped)
- Session IDs are stored in browser localStorage — clearing localStorage resets the session

---

## Built With

- [Groq](https://groq.com) — LLM inference (llama-3.3-70b-versatile)
- [DuckDB](https://duckdb.org) — in-process SQL analytics engine
- [Tavily](https://tavily.com) — real-time web search API
- [FastAPI](https://fastapi.tiangolo.com) — Python API framework
- [React](https://react.dev) + [TanStack Router](https://tanstack.com/router) — frontend
- [Recharts](https://recharts.org) — chart rendering
- [Framer Motion](https://www.framer.com/motion) — animations
- [shadcn/ui](https://ui.shadcn.com) — component library
