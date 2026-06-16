import json
import os
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
_MODEL = os.getenv("GENERATION_MODEL", "llama-3.3-70b-versatile")


def profile_dataset(session_id: str, table_name: str) -> dict:
    from db_duckdb import _sessions
    conn = _sessions[session_id]["conn"]

    row_count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
    describe = conn.execute(f'DESCRIBE "{table_name}"').fetchall()

    col_profiles = []
    null_pcts = []

    for row in describe:
        col_name, col_type = row[0], row[1]

        try:
            null_count = conn.execute(
                f'SELECT COUNT(*) FROM "{table_name}" WHERE "{col_name}" IS NULL'
            ).fetchone()[0]
        except Exception:
            null_count = 0

        null_pct = round(null_count / max(row_count, 1) * 100, 1)
        null_pcts.append(null_pct)
        profile: dict = {"name": col_name, "type": col_type, "null_pct": null_pct}

        t_upper = col_type.upper()
        if any(k in t_upper for k in ("INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "REAL")):
            try:
                stats = conn.execute(
                    f'SELECT MIN("{col_name}"), MAX("{col_name}"), AVG("{col_name}") FROM "{table_name}"'
                ).fetchone()
                profile["min"] = round(float(stats[0]), 2) if stats[0] is not None else None
                profile["max"] = round(float(stats[1]), 2) if stats[1] is not None else None
                profile["avg"] = round(float(stats[2]), 2) if stats[2] is not None else None
            except Exception:
                pass
        elif any(k in t_upper for k in ("VARCHAR", "TEXT", "CHAR", "STRING")):
            try:
                unique = conn.execute(
                    f'SELECT COUNT(DISTINCT "{col_name}") FROM "{table_name}"'
                ).fetchone()[0]
                profile["unique_count"] = unique
            except Exception:
                pass
        elif any(k in t_upper for k in ("DATE", "TIMESTAMP")):
            try:
                rng = conn.execute(
                    f'SELECT MIN("{col_name}"), MAX("{col_name}") FROM "{table_name}"'
                ).fetchone()
                profile["date_min"] = str(rng[0]) if rng[0] else None
                profile["date_max"] = str(rng[1]) if rng[1] else None
            except Exception:
                pass

        col_profiles.append(profile)

    health_score = round(100 - (sum(null_pcts) / max(len(null_pcts), 1)), 1)

    col_summary = "\n".join(f"- {c['name']} ({c['type']})" for c in col_profiles)
    prompt = f"""You are a data analyst. A user uploaded a CSV with {row_count} rows and these columns:

{col_summary}

Respond ONLY with valid JSON in this exact format:
{{
  "dataset_type": "2-4 word label (e.g. 'Retail Weekly Sales', 'HR Employee Records', 'E-commerce Orders')",
  "questions": [
    "Question using actual column names from above",
    "Question using actual column names from above",
    "Question using actual column names from above",
    "Question using actual column names from above",
    "Question using actual column names from above"
  ]
}}"""

    try:
        resp = _client.chat.completions.create(
            model=_MODEL,
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        m = re.search(r'\{.*\}', text, re.DOTALL)
        ai = json.loads(m.group(0)) if m else {}
    except Exception:
        ai = {}

    return {
        "dataset_type": ai.get("dataset_type", "Business Data"),
        "health_score": health_score,
        "row_count": row_count,
        "col_count": len(col_profiles),
        "columns": col_profiles,
        "suggested_questions": ai.get("questions", []),
    }
