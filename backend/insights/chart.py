import pandas as pd

def select_chart_config(results: list[dict], columns: list[str]) -> dict | None:
    if not results or len(columns) < 2:
        return None

    df = pd.DataFrame(results)

    date_keywords = ["date", "month", "year", "week", "quarter", "period"]

    str_cols = [c for c in columns if df[c].dtype == object]
    float_cols = [c for c in columns if pd.api.types.is_float_dtype(df[c])]
    int_cols = [c for c in columns if pd.api.types.is_integer_dtype(df[c])]
    num_cols = float_cols + int_cols

    if str_cols and num_cols:
        x_col = str_cols[0]
        y_col = num_cols[0]
    elif int_cols and float_cols:
        x_col = int_cols[0]
        y_col = float_cols[0]
    else:
        return None

    x_is_date = any(kw in x_col.lower() for kw in date_keywords)
    few_categories = df[x_col].nunique() <= 6

    if x_is_date:
        chart_type = "line"
    elif few_categories:
        chart_type = "pie"
    else:
        chart_type = "bar"

    data_for_chart = df[[x_col, y_col]].head(20).to_dict(orient="records")

    return {
        "type": chart_type,
        "x_key": x_col,
        "y_key": y_col,
        "data": data_for_chart,
    }
