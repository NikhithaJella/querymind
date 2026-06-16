import re
import sqlglot
import sqlglot.expressions as exp
from fastapi import HTTPException

_BLOCKED = {
    "Drop", "Delete", "Insert", "Update", "Create", "AlterTable",
    "TruncateTable", "ReplaceInto", "Merge", "Grant", "Revoke",
}
_BLOCKED_REGEX = re.compile(
    r'\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE)\b',
    re.IGNORECASE,
)


def validate_sql(sql: str) -> str:
    try:
        statements = sqlglot.parse(sql)
        for stmt in statements:
            if stmt is None:
                continue
            stmt_type = type(stmt).__name__
            if not isinstance(stmt, exp.Select):
                raise HTTPException(
                    status_code=403,
                    detail=f"Security violation: only SELECT statements are permitted. Detected: {stmt_type}.",
                )
        return sql
    except HTTPException:
        raise
    except Exception:
        # sqlglot couldn't parse it — fall back to regex
        match = _BLOCKED_REGEX.search(sql)
        if match:
            raise HTTPException(
                status_code=403,
                detail=f"Security violation: {match.group(0).upper()} statements are not allowed.",
            )
        return sql
