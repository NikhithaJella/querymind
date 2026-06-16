import time
import re
from collections import defaultdict

MAX_AGE_SECONDS = 3600

_cache: dict[str, list] = defaultdict(list)


def _normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text.lower().strip())


def get_cached(session_id: str, question: str) -> dict | None:
    entries = _cache[session_id]
    if not entries:
        return None
    normalized = _normalize(question)
    now = time.time()
    for entry in entries:
        if now - entry["ts"] > MAX_AGE_SECONDS:
            continue
        if entry["q_norm"] == normalized:
            return {**entry["response"], "cached": True}
    return None


def set_cache(session_id: str, question: str, response: dict):
    _cache[session_id].append({
        "q_norm": _normalize(question),
        "response": response,
        "ts": time.time(),
    })


def clear_cache(session_id: str):
    _cache.pop(session_id, None)
