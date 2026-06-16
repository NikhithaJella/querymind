import os
import duckdb
import tempfile

# keyed by session_id; each entry holds a duckdb conn + loaded table metadata
_sessions: dict[str, dict] = {}


def _sanitize_table_name(filename: str) -> str:
    base = os.path.splitext(filename)[0]
    name = "".join(c if c.isalnum() else "_" for c in base).lower().strip("_")
    if not name or name[0].isdigit():
        name = "uploaded_data"
    return name


def load_csv(session_id: str, file_bytes: bytes, filename: str) -> dict:
    # reuse conn so multiple uploads share the same in-memory db
    if session_id in _sessions:
        conn = _sessions[session_id]["conn"]
        existing_names = {t["name"] for t in _sessions[session_id]["tables"]}
    else:
        conn = duckdb.connect()
        existing_names = set()

    # handle duplicate filenames in same session
    base_name = _sanitize_table_name(filename)
    table_name = base_name
    counter = 2
    while table_name in existing_names:
        table_name = f"{base_name}_{counter}"
        counter += 1

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="wb") as f:
        f.write(file_bytes)
        tmp_path = f.name

    try:
        conn.execute(
            f'CREATE TABLE "{table_name}" AS SELECT * FROM read_csv_auto(?, auto_detect=true, sample_size=2000)',
            [tmp_path],
        )
        describe = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        row_count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
    except Exception as e:
        if session_id not in _sessions:
            conn.close()
        raise ValueError(f"Could not parse CSV: {e}") from e
    finally:
        os.unlink(tmp_path)

    table_info = {
        "name": table_name,
        "row_count": row_count,
        "columns": [{"name": r[0], "type": r[1]} for r in describe],
    }

    if session_id in _sessions:
        _sessions[session_id]["tables"].append(table_info)
    else:
        _sessions[session_id] = {"conn": conn, "tables": [table_info]}

    return table_info


def get_schema_context(session_id: str) -> str:
    info = _sessions[session_id]
    conn = info["conn"]
    parts = []

    for table in info["tables"]:
        table_name = table["name"]
        describe = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        sample_rows = conn.execute(f'SELECT * FROM "{table_name}" LIMIT 3').fetchall()
        col_names = [r[0] for r in describe]

        cols_str = "\n".join(f"  - {r[0]} ({r[1]})" for r in describe)
        sample_str = "\n".join(str(dict(zip(col_names, row))) for row in sample_rows)

        parts.append(
            f"Table: {table_name}\n"
            f"Columns:\n{cols_str}\n\n"
            f"Sample rows (first 3):\n{sample_str}"
        )

    if len(info["tables"]) > 1:
        names = [t["name"] for t in info["tables"]]
        parts.append(
            f"NOTE: {len(names)} tables are available in this session: {', '.join(names)}. "
            "You can JOIN them if the question requires cross-table analysis."
        )

    return "\n\n---\n\n".join(parts)


def get_session_tables(session_id: str) -> list[str]:
    if session_id not in _sessions:
        return []
    return [t["name"] for t in _sessions[session_id]["tables"]]


def execute_query(session_id: str, sql: str) -> tuple[list[dict], list[str]]:
    conn = _sessions[session_id]["conn"]
    result = conn.execute(sql)
    cols = [d[0] for d in result.description]
    rows = result.fetchmany(500)
    records = [dict(zip(cols, row)) for row in rows]
    return records, cols


def has_session(session_id: str) -> bool:
    return session_id in _sessions


def clear_session(session_id: str):
    if session_id in _sessions:
        _sessions[session_id]["conn"].close()
        del _sessions[session_id]
