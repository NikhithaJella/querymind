import os
import re
import time
from groq import Groq
from dotenv import load_dotenv
from agent.memory import format_history_for_prompt
from security import validate_sql

load_dotenv()
_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
_MODEL = os.getenv("GENERATION_MODEL", "llama-3.3-70b-versatile")

MAX_RETRIES = 3


def _extract_sql(text: str) -> str:
    match = re.search(r"```sql\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r"SELECT .+", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(0).strip()
    return text.strip()


def _build_prompt(
    question: str,
    schema_context: str,
    history: str,
    failed_sql: str = None,
    error: str = None,
) -> str:
    parts = [
        "You are a DuckDB SQL expert. Generate a single valid SQL SELECT query.",
        "",
        "RULES:",
        "- Output ONLY the SQL inside ```sql ... ``` fences.",
        "- Use only the tables and columns provided in the schema below.",
        "- Never use DROP, DELETE, INSERT, UPDATE, CREATE, ALTER, or TRUNCATE.",
        "- Limit results to 100 rows using LIMIT 100 unless the user asks for all.",
        "- Use table aliases for readability.",
        '- Quote column names that contain spaces using double quotes.',
        "",
        "SCHEMA CONTEXT (tables from the uploaded CSV file):",
        schema_context,
    ]

    if history:
        parts += ["", history]

    parts += ["", f"USER QUESTION: {question}"]

    if failed_sql and error:
        parts += [
            "",
            "PREVIOUS ATTEMPT FAILED — fix the SQL below:",
            f"Failed SQL:\n{failed_sql}",
            f"Error: {error}",
            "Correct it and return valid SQL only.",
        ]

    return "\n".join(parts)


def run_agent(
    question: str,
    session_id: str,
    schema_context: str,
) -> dict:
    history = format_history_for_prompt(session_id)

    failed_sql = None
    error_msg = None
    retries = 0
    retry_history: list[dict] = []

    while retries < MAX_RETRIES:
        prompt = _build_prompt(question, schema_context, history, failed_sql, error_msg)
        try:
            response = _client.chat.completions.create(
                model=_MODEL,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as e:
            return {
                "sql": "",
                "results": [],
                "columns": [],
                "confidence": "Failed",
                "retries": retries,
                "error": f"Groq API unavailable: {e}",
                "retry_history": retry_history,
                "sql_exec_ms": 0,
            }
        sql = _extract_sql(response.choices[0].message.content)

        validate_sql(sql)

        try:
            t0 = time.time()
            from db_duckdb import execute_query as duckdb_execute
            results, columns = duckdb_execute(session_id, sql)
            exec_ms = round((time.time() - t0) * 1000)

            confidence = "High" if retries == 0 else ("Medium" if retries == 1 else "Low")
            return {
                "sql": sql,
                "results": results,
                "columns": columns,
                "confidence": confidence,
                "retries": retries,
                "retry_history": retry_history,
                "sql_exec_ms": exec_ms,
            }
        except Exception as e:
            error_msg = str(e)
            retry_history.append({"attempt": retries + 1, "sql": sql, "error": error_msg})
            failed_sql = sql
            retries += 1

    return {
        "sql": failed_sql,
        "results": [],
        "columns": [],
        "confidence": "Failed",
        "retries": retries,
        "error": error_msg,
        "retry_history": retry_history,
        "sql_exec_ms": 0,
    }
