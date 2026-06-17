# QueryMind — Manual Smoke Tests

These are manual end-to-end checks to run before a demo or deployment.
No automated test runner required — just the running app.

## Prerequisites

- Backend running at `http://localhost:8000`
- Frontend running at `http://localhost:5173`
- `GROQ_API_KEY` and `TAVILY_API_KEY` set in `backend/.env`
- A test CSV ready (the Walmart sales CSV from the repo works for all numeric checks)

---

## Smoke Test Checklist

### 1. Backend starts
- [ ] `uvicorn main:app --reload` starts without errors
- [ ] `GET http://localhost:8000/health` returns `{"status": "ok"}`

### 2. Frontend starts
- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:5173` loads with sidebar and chat panel visible

### 3. CSV upload
- [ ] Drag-and-drop a `.csv` file onto the upload zone
- [ ] Data Passport card appears: dataset type label, health score, column stats, 5 suggested questions
- [ ] Dataset name appears in the sidebar

### 4. Basic aggregation question
- [ ] Ask: *"Which store had the highest total weekly sales?"*
- [ ] SQL is shown in the Insights tab
- [ ] Table tab shows rows with a Store column and a numeric total
- [ ] Chart tab renders a bar chart

### 5. Trend / time-series question
- [ ] Ask: *"Show me weekly sales over time for store 1"*
- [ ] Chart type switches to **Line** (because the x-axis contains a date keyword)
- [ ] X-axis values are date-like strings

### 6. Generated SQL and result verification
- [ ] Open the Insights tab
- [ ] SQL displayed matches the question (correct table name, correct column names)
- [ ] Row count in the response matches what you would expect
- [ ] Confidence badge shows "High" on a clean first-attempt query

### 7. Chart output
- [ ] Bar, Line, and Pie toggle buttons are present
- [ ] Switching chart type re-renders without error
- [ ] Sort (Ascending / Descending) and filter (Top 5 / 10 / 20 / All) controls work
- [ ] Download PNG button saves an image

### 8. Follow-up question memory
- [ ] After the aggregation query above, ask: *"Now show only the top 5"*
- [ ] The new SQL adds `LIMIT 5` — confirm it still references the correct table without re-stating it
- [ ] Result set has exactly 5 rows

### 9. Invalid / unanswerable question
- [ ] Ask: *"What is the weather today?"*
- [ ] Either returns a graceful error message or a 422 response (not a server crash)
- [ ] UI shows a readable error, not a blank screen

### 10. Unsafe SQL input blocked
- [ ] Using curl or the browser console, POST to `/query` with question `"DROP TABLE walmart"`
  ```bash
  curl -X POST http://localhost:8000/query \
    -H "Content-Type: application/json" \
    -d '{"question": "DROP TABLE walmart", "session_id": "test"}'
  ```
- [ ] Response is HTTP 403 with message containing "Only SELECT statements are permitted"
- [ ] Table still exists — next valid query still returns results

### 11. Empty / malformed CSV
- [ ] Upload a `.csv` file that contains only a header row and no data rows
- [ ] Upload should succeed (or return a clear error — no server crash)
- [ ] Asking a question on the empty dataset returns a readable message, not a 500

- [ ] Upload a file with `.csv` extension but binary/garbage content
- [ ] Server returns HTTP 422 with a descriptive error message

### 12. HTML report export
- [ ] Run two or more queries in a session
- [ ] Click "Download Report" in the top bar
- [ ] A `.html` file downloads
- [ ] Open the file offline in a browser — charts and narratives render correctly
- [ ] File works without an internet connection (Chart.js is embedded inline)

---

## Notes

- All checks above should pass with zero code changes on a clean install.
- If a Groq/Tavily API key is invalid, tests 3–8 will return 500/API errors — verify keys first.
- The self-healing loop (retry badge) can be triggered by asking about a column name with a typo; exact behavior depends on the LLM.
