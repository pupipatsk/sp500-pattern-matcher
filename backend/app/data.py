from __future__ import annotations

from pathlib import Path
from typing import TypedDict

import pandas as pd
import yfinance as yf


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
SP500_CSV_PATH = DATA_DIR / "sp500.csv"
TICKER = "^GSPC"

_DF: pd.DataFrame | None = None


class DatasetMeta(TypedDict):
    rows: int
    min_date: str
    max_date: str


def _download_and_cache() -> pd.DataFrame:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    df = yf.download(TICKER, period="max", interval="1d", auto_adjust=False, progress=False)
    if df is None or df.empty:
        raise RuntimeError("yfinance returned empty dataset for ^GSPC")

    # yfinance ≥1.0 returns a MultiIndex column (field, ticker); flatten it.
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.reset_index()
    if "Date" not in df.columns:
        raise RuntimeError("Unexpected yfinance schema: missing Date column")
    if "Close" not in df.columns:
        raise RuntimeError(f"Unexpected yfinance schema: columns={list(df.columns)}")

    keep = df[["Date", "Close"]].copy()
    keep["Date"] = pd.to_datetime(keep["Date"]).dt.date
    keep = keep.dropna(subset=["Close"]).sort_values("Date")

    keep.to_csv(SP500_CSV_PATH, index=False)
    return keep


def _read_cache() -> pd.DataFrame:
    df = pd.read_csv(SP500_CSV_PATH)
    if "Date" not in df.columns or "Close" not in df.columns:
        raise RuntimeError(f"Invalid cache schema at {SP500_CSV_PATH}")
    df["Date"] = pd.to_datetime(df["Date"]).dt.date
    df = df.dropna(subset=["Close"]).sort_values("Date")
    return df


def get_sp500_df() -> pd.DataFrame:
    global _DF
    if _DF is not None:
        return _DF

    if SP500_CSV_PATH.exists():
        _DF = _read_cache()
    else:
        _DF = _download_and_cache()

    return _DF


def get_dataset_meta() -> DatasetMeta:
    df = get_sp500_df()
    min_date = df["Date"].iloc[0].isoformat()
    max_date = df["Date"].iloc[-1].isoformat()
    return {"rows": int(len(df)), "min_date": min_date, "max_date": max_date}
