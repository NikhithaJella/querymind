import os
from dotenv import load_dotenv

load_dotenv()

_EXTERNAL_KEYWORDS = {
    "market", "industry", "benchmark", "inflation", "competitor", "trend",
    "economy", "gdp", "sector", "global", "macro", "average industry",
    "compared to market", "external", "news", "forecast", "outlook",
    "interest rate", "recession", "growth rate",
}


def needs_web_context(question: str, results: list) -> bool:
    q_lower = question.lower()
    has_keyword = any(kw in q_lower for kw in _EXTERNAL_KEYWORDS)
    has_empty_results = len(results) == 0
    return has_keyword or has_empty_results


def fetch_web_context(question: str) -> str:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return ""

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=f"business analytics data: {question}",
            search_depth="basic",
            max_results=3,
        )
        chunks = []
        for item in response.get("results", []):
            title = item.get("title", "")
            content = (item.get("content") or "")[:600]
            url = item.get("url", "")
            chunks.append(f"[{title}]\n{content}\nSource: {url}")
        return "\n\n---\n\n".join(chunks)
    except Exception:
        return ""
