import pandas as pd


def detect_anomalies(results: list[dict], columns: list[str]) -> list[str]:
    if not results or len(results) < 3:
        return []

    try:
        df = pd.DataFrame(results)
    except Exception:
        return []

    anomalies = []

    # first string col we can use to label an outlier row
    label_col = next(
        (c for c in columns if c in df.columns and not pd.api.types.is_numeric_dtype(df[c])),
        None,
    )

    for col in columns:
        if col not in df.columns:
            continue

        series = df[col]

        null_count = int(series.isna().sum())
        if null_count > 0:
            null_pct = null_count / len(series)
            if null_pct > 0.1:
                anomalies.append(
                    f"⚠️ '{col}' has {null_pct:.0%} null values ({null_count}/{len(series)} rows)"
                )

        # IQR-based outlier check
        if pd.api.types.is_numeric_dtype(series):
            clean = series.dropna()
            if len(clean) >= 4:
                Q1 = clean.quantile(0.25)
                Q3 = clean.quantile(0.75)
                IQR = Q3 - Q1
                if IQR > 0:
                    outlier_mask = (clean < Q1 - 1.5 * IQR) | (clean > Q3 + 1.5 * IQR)
                    outliers = clean[outlier_mask]
                    if not outliers.empty:
                        mean = clean.mean()
                        std = clean.std() + 1e-10
                        extreme_idx = (outliers - mean).abs().idxmax()
                        val = outliers[extreme_idx]
                        z = abs(val - mean) / std
                        if label_col and extreme_idx < len(df):
                            label = str(df.loc[extreme_idx, label_col])
                            anomalies.append(
                                f"📈 '{label}' is an outlier in '{col}': "
                                f"{val:,.2f} ({z:.1f}σ from mean {mean:,.2f})"
                            )
                        else:
                            anomalies.append(
                                f"📈 '{col}' has {len(outliers)} outlier(s); "
                                f"most extreme: {val:,.2f} ({z:.1f}σ from mean {mean:,.2f})"
                            )

    return anomalies[:5]
