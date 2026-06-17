from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.sql_agent import run_agent
from agent.memory import add_turn, get_history, clear_history
from insights.chart import select_chart_config
from insights.narrative import generate_narrative
from insights.anomaly import detect_anomalies
from insights.profiler import profile_dataset
from db_duckdb import load_csv, get_schema_context, get_session_tables, has_session, clear_session as clear_duckdb
from cache import get_cached, set_cache, clear_cache
from retrieval.web_rag import needs_web_context, fetch_web_context

app = FastAPI(title="Text-to-SQL Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Liveness probe — used by Render and the smoke test checklist."""
    return {"status": "ok"}




@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    session_id: str = Form("default"),
):
    """Load a CSV into a per-session DuckDB table and return a Data Passport.

    Runs the profiler (column stats + Groq dataset classification) after loading.
    Clears the query cache so stale answers from a previous upload are not served.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    try:
        info = load_csv(session_id, content, file.filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    clear_cache(session_id)

    all_tables = get_session_tables(session_id)
    multi = len(all_tables) > 1
    msg = (
        f"Dataset '{info['name']}' loaded with {info['row_count']} rows. "
        f"Session now has {len(all_tables)} table(s): {', '.join(all_tables)}."
        + (" You can now ask questions that join these tables!" if multi else "")
    )

    try:
        profile = profile_dataset(session_id, info["name"])
    except Exception:
        profile = None

    return {
        "status": "uploaded",
        "table_name": info["name"],
        "row_count": info["row_count"],
        "columns": {col["name"]: col["type"] for col in info["columns"]},
        "session_tables": all_tables,
        "message": msg,
        "profile": profile,
    }


class QueryRequest(BaseModel):
    question: str
    session_id: str = "default"


@app.post("/query")
def query(req: QueryRequest):
    """Translate a natural-language question to SQL, execute it, and return enriched results.

    Pipeline (cache miss only): web RAG check → SQL generation with self-healing retry loop →
    SQL validation (security.py) → DuckDB execution → anomaly detection → chart selection →
    Groq narrative. Cache hit returns instantly with no AI or DB calls.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    thinking_steps: list[str] = []

    cached = get_cached(req.session_id, req.question)
    if cached:
        return {**cached, "thinking_steps": ["⚡ Cache hit — served instantly from semantic cache"]}

    thinking_steps.append("🔍 Semantic cache miss — running fresh query")

    if not has_session(req.session_id):
        raise HTTPException(status_code=400, detail="No CSV uploaded yet. Please upload a CSV file first.")

    tables = get_session_tables(req.session_id)
    schema_context = get_schema_context(req.session_id)
    thinking_steps.append(
        f"📂 CSV session active — {len(tables)} table(s) loaded: {', '.join(tables)}"
    )
    agent_result = run_agent(req.question, req.session_id, schema_context=schema_context)

    if agent_result["confidence"] == "Failed":
        raise HTTPException(
            status_code=422,
            detail=f"Could not generate valid SQL after 3 attempts. Last error: {agent_result.get('error')}",
        )

    results = agent_result["results"]
    columns = agent_result["columns"]
    sql = agent_result["sql"]

    thinking_steps.append("📝 Generating SQL from scratch")

    retries = agent_result.get("retries", 0)
    exec_ms = agent_result.get("sql_exec_ms", 0)
    if retries == 0:
        thinking_steps.append(
            f"✅ SQL executed on first attempt — {len(results)} rows returned in {exec_ms}ms"
        )
    else:
        thinking_steps.append(
            f"🔄 Self-healed after {retries} retry(ies) — SQL corrected and executed in {exec_ms}ms"
        )

    external_context = ""
    if needs_web_context(req.question, results):
        external_context = fetch_web_context(req.question)
        if external_context:
            thinking_steps.append("🌐 Tavily fetched real-time external context — enriching narrative")

    anomalies = detect_anomalies(results, columns)
    if anomalies:
        thinking_steps.append(f"🔬 Anomaly detector found {len(anomalies)} data quality insight(s)")

    thinking_steps.append("🧠 Generating AI narrative and follow-up suggestions")
    chart = select_chart_config(results, columns)
    insight = generate_narrative(req.question, sql, results, external_context)

    add_turn(req.session_id, req.question, sql, insight.get("narrative", ""))

    response = {
        "sql": sql,
        "columns": columns,
        "results": results[:100],
        "total_rows": len(results),
        "confidence": agent_result["confidence"],
        "used_golden_query": False,
        "retry_history": agent_result.get("retry_history", []),
        "web_context_used": bool(external_context),
        "chart": chart,
        "narrative": insight.get("narrative", ""),
        "suggestions": insight.get("suggestions", []),
        "anomalies": anomalies,
        "thinking_steps": thinking_steps,
        "cached": False,
    }

    set_cache(req.session_id, req.question, response)

    return response


class SessionRequest(BaseModel):
    session_id: str = "default"


@app.get("/history")
def history(session_id: str = "default"):
    return get_history(session_id)


@app.delete("/history")
def delete_history(req: SessionRequest):
    clear_history(req.session_id)
    clear_duckdb(req.session_id)
    clear_cache(req.session_id)
    return {"status": "cleared"}
