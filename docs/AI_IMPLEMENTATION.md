# QueryMind — AI Implementation Details

This document covers every place AI is used in QueryMind, how prompts are constructed,
how SQL is validated, and how the self-repair loop works.

---

## Where AI Is Used

QueryMind calls the Groq API in three distinct places:

| Module | File | Purpose |
|---|---|---|
| SQL generation | `backend/agent/sql_agent.py` | Translate user question → DuckDB SQL |
| Dataset profiling | `backend/insights/profiler.py` | Classify dataset type + generate 5 suggested questions |
| Narrative generation | `backend/insights/narrative.py` | Explain query results in plain English |

All three use the same model: `llama-3.3-70b-versatile` via `groq.Groq(api_key=...)`.

---

## Text-to-SQL: Where It Happens

File: `backend/agent/sql_agent.py`, function `run_agent()`

This is the core AI pipeline. It is called on every `POST /query` request (cache misses only).

```
run_agent(question, session_id, db)
  │
  ├─ memory.get_history(session_id)      → last 5 Q/SQL/narrative turns
  ├─ db.get_schema_context(session_id)   → table schema + 3 sample rows
  ├─ _build_prompt(...)                  → assemble full prompt string
  ├─ groq_client.chat.completions.create → call LLaMA 3.3 70B
  ├─ _extract_sql(response)              → pull SQL out of markdown fences
  ├─ security.validate_sql(sql)          → block non-SELECT (raises 403 if violated)
  └─ db.execute_query(sql, session_id)   → run on DuckDB, return rows + columns
```

---

## How Prompts Are Built

### SQL Generation Prompt (`_build_prompt()`)

The prompt is assembled in layers. Each layer adds context that helps the LLM produce
accurate, runnable DuckDB SQL.

**System message (static rules):**
```
You are an expert DuckDB SQL analyst.
Rules:
- Use ONLY the table(s) and column names provided in the schema.
- Generate only a single valid DuckDB SELECT query.
- Always wrap your SQL in ```sql ... ``` fences.
- Do not use backtick identifiers. Use double quotes for names with spaces.
- Return only the SQL. No explanation.
```

**Schema context (dynamic, per session):**
```
Available tables and schemas:

Table: walmart
Columns: Store INTEGER, Date VARCHAR, Weekly_Sales DOUBLE, Holiday_Flag INTEGER,
         Temperature DOUBLE, Fuel_Price DOUBLE, CPI DOUBLE, Unemployment DOUBLE

Sample rows:
Store | Date       | Weekly_Sales  | Holiday_Flag | Temperature | ...
1     | 05-02-2010 | 1643690.90    | 0            | 42.31       | ...
1     | 12-02-2010 | 1641957.44    | 1            | 38.51       | ...
```

**Conversation history (dynamic, last 5 turns):**
```
Previous conversation:
Q: What is the total weekly sales per store?
SQL: SELECT Store, SUM(Weekly_Sales) AS total_sales FROM walmart GROUP BY Store ORDER BY total_sales DESC

Q: Now show only the top 5.
SQL: SELECT Store, SUM(Weekly_Sales) AS total_sales FROM walmart GROUP BY Store ORDER BY total_sales DESC LIMIT 5
```

**Current question:**
```
Current question: Which stores had above-average sales during holiday weeks?
```

**On retry — failed SQL and error appended:**
```
Attempt 1 failed.
SQL tried: SELECT Store, Weekly_Sales FROM walmart WHERE Holiday = 1
Error: Column "Holiday" not found. Did you mean "Holiday_Flag"?

Please correct the SQL.
```

### Dataset Profiling Prompt (`profiler.py`)

Sent once per CSV upload. The prompt includes a JSON summary of all columns
(name, type, null %, sample values) and asks for:
1. A 2–4 word dataset type label (e.g. "Retail Weekly Sales")
2. Five specific, answerable business questions using actual column names

The response is parsed as JSON: `{dataset_type: str, questions: [str, ...]}`

### Narrative Prompt (`narrative.py`)

Sent after every successful SQL execution. The prompt includes:
- The original user question
- The generated SQL
- The first 5 result rows as JSON
- Optional web search context from Tavily (if triggered)

It asks for a 2–3 sentence business narrative and 2 follow-up questions.
Response is parsed as JSON: `{narrative: str, suggestions: [str, str]}`

---

## SQL Validation

File: `backend/security.py`, function `validate_sql(sql: str)`

Validation runs on every AI-generated SQL string before it touches DuckDB.
Two independent layers:

### Layer 1 — sqlglot AST parsing

```python
statements = sqlglot.parse(sql)
for statement in statements:
    if not isinstance(statement, sqlglot.expressions.Select):
        raise HTTPException(403, "Only SELECT queries are permitted")
```

sqlglot parses the SQL string into an Abstract Syntax Tree. The type of each
top-level statement is checked. Anything that is not a `Select` node raises
an immediate 403. This catches:

- `DROP TABLE walmart`
- `DELETE FROM walmart WHERE 1=1`
- `INSERT INTO walmart VALUES (...)`
- `UPDATE walmart SET ...`
- `CREATE TABLE ... AS ...`
- Multi-statement injections: `SELECT 1; DROP TABLE walmart`

### Layer 2 — Regex fallback

If sqlglot raises a parse exception (malformed SQL, unsupported dialect edge case),
a regex pattern scans the SQL string for blocked keywords as a safety net:

```
Blocked: DROP, DELETE, INSERT, UPDATE, CREATE, ALTER, TRUNCATE,
         REPLACE, MERGE, GRANT, REVOKE
```

Any match raises 403.

The prompt itself also instructs the LLM to generate only SELECT statements.
These are three independent barriers — the prompt as a soft constraint, and
two code-level hard blocks.

---

## SQL Repair Loop

File: `backend/agent/sql_agent.py`, inside `run_agent()`

When the LLM generates SQL that fails (parse error, wrong column name, type mismatch),
the error is fed back into the next prompt so the LLM can self-correct.

```
MAX_ATTEMPTS = 3
retry_history = []

for attempt in range(MAX_ATTEMPTS):
    prompt = _build_prompt(
        question=question,
        schema=schema_context,
        history=conversation_history,
        retry_history=retry_history   ← grows with each failure
    )
    
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=prompt,
        temperature=0
    )
    
    sql = _extract_sql(response.choices[0].message.content)
    validate_sql(sql)           ← raises 403 if non-SELECT
    
    try:
        rows, columns = db.execute_query(sql, session_id)
        confidence = ["High", "Medium", "Low"][attempt]
        return sql, rows, columns, confidence, retry_history
    except Exception as e:
        retry_history.append({"sql": sql, "error": str(e)})

raise HTTPException(422, "Could not generate valid SQL after 3 attempts")
```

`temperature=0` is intentional — deterministic output is better for SQL generation
than creative variation. On retries, the exact error string from DuckDB is passed
back so the model can correct specific issues (wrong column name, wrong function, etc.).

---

## API Endpoints Involved

| Endpoint | AI calls made |
|---|---|
| `POST /upload` | 1 Groq call — dataset classification + suggested questions (profiler.py) |
| `POST /query` (cache miss) | 1–3 Groq calls — SQL generation (sql_agent.py) + 1 Groq call — narrative (narrative.py) |
| `POST /query` (cache hit) | 0 Groq calls |
| `GET /history` | 0 Groq calls |
| `DELETE /history` | 0 Groq calls |

Web search (Tavily) is called at most once per `/query` request, only when
`web_rag.needs_web_context(question, results)` returns True.

---

## Model Choice

| Property | Value |
|---|---|
| Provider | Groq |
| Model | llama-3.3-70b-versatile |
| Temperature | 0 (SQL generation), 0.3 (narrative) |
| Max tokens | Not explicitly capped — relies on model default |
| Context window | 128k tokens |

LLaMA 3.3 70B was chosen for its strong SQL reasoning, large context window
(important for multi-table schemas + conversation history), and Groq's low
inference latency (typically <1s for SQL generation).
