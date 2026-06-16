from collections import defaultdict, deque

_sessions: dict[str, deque] = defaultdict(lambda: deque(maxlen=5))

def add_turn(session_id: str, question: str, sql: str, narrative: str):
    _sessions[session_id].append({
        "question": question,
        "sql": sql,
        "narrative": narrative
    })

def get_history(session_id: str) -> list[dict]:
    return list(_sessions[session_id])

def clear_history(session_id: str):
    _sessions[session_id].clear()

def format_history_for_prompt(session_id: str) -> str:
    history = get_history(session_id)
    if not history:
        return ""
    lines = ["Previous conversation turns:"]
    for turn in history:
        lines.append(f"Q: {turn['question']}")
        lines.append(f"SQL: {turn['sql']}")
    return "\n".join(lines)
