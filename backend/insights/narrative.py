import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
_MODEL = os.getenv("GENERATION_MODEL", "llama-3.3-70b-versatile")


def generate_narrative(
    question: str,
    sql: str,
    results: list[dict],
    external_context: str = "",
) -> dict:
    if not results and not external_context:
        return {
            "narrative": "No results were returned for this query.",
            "suggestions": [],
        }

    preview = results[:5]
    total_rows = len(results)

    external_section = ""
    if external_context:
        external_section = f"""
EXTERNAL MARKET CONTEXT (from real-time web search):
{external_context}

Use this external context to enrich your analysis with market benchmarks or industry trends where relevant.
"""

    prompt = f"""You are a senior business analyst delivering a concise data briefing.

User asked: "{question}"

SQL used:
{sql}

Internal data: {total_rows} rows returned. First 5 rows:
{json.dumps(preview, indent=2, default=str)}
{external_section}
Your task:
1. Write a 2-3 sentence business narrative with the key insight. Be specific — mention actual numbers, names, or dates from the results. If external context is provided, relate internal data to market benchmarks.
2. Suggest exactly 2 follow-up questions the user might want to ask next.

Respond in this exact JSON format:
{{
  "narrative": "...",
  "suggestions": ["...", "..."]
}}"""

    try:
        response = _client.chat.completions.create(
            model=_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content.strip()
    except Exception:
        return {
            "narrative": f"Query returned {total_rows} row(s). (AI narrative temporarily unavailable — please retry in a moment.)",
            "suggestions": ["Try a different metric or time period.", "Ask for a breakdown by category or region."],
        }

    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass

    return {"narrative": text, "suggestions": []}
