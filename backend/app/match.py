from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from .data import get_sp500_df
from .models import ForwardReturns, MatchPayload, MatchResponse, QueryPayload
from .tsmining import compute_envelope, dtw_sakoe_chiba, lb_keogh, znormalize


FORWARD_DAYS_V0 = 756  # ~3 trading years
STD_LO = 0.7
STD_HI = 1.5


def _to_date(s: str) -> date:
    return pd.to_datetime(s).date()


def _snap_to_trading_day(d: date, trading_days: list[date]) -> date:
    # Choose the closest available trading day by absolute distance.
    # For speed, we binary-search via pandas.
    idx = pd.DatetimeIndex(pd.to_datetime(trading_days))
    pos = idx.get_indexer([pd.Timestamp(d)], method="nearest")[0]
    return trading_days[int(pos)]


def _slice_by_dates(df: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
    mask = (df["Date"] >= start) & (df["Date"] <= end)
    out = df.loc[mask, ["Date", "Close"]].copy()
    out = out.sort_values("Date")
    return out


def build_match_response(*, query_start_date: str, query_end_date: str) -> MatchResponse:
    df = get_sp500_df()
    trading_days = df["Date"].tolist()

    min_d = trading_days[0]
    max_d = trading_days[-1]

    raw_start = _to_date(query_start_date)
    raw_end = _to_date(query_end_date)
    if raw_start > raw_end:
        raw_start, raw_end = raw_end, raw_start

    clamped_start = min(max(raw_start, min_d), max_d)
    clamped_end = min(max(raw_end, min_d), max_d)

    start = _snap_to_trading_day(clamped_start, trading_days)
    end = _snap_to_trading_day(clamped_end, trading_days)
    if start > end:
        start, end = end, start

    query_df = _slice_by_dates(df, start, end)
    if query_df.empty:
        raise RuntimeError("Query date range produced empty slice")

    n = int(len(query_df))
    forward_days = int(FORWARD_DAYS_V0)

    # Build index mapping Date -> row index for overlap checks.
    day_to_idx = {d: i for i, d in enumerate(trading_days)}
    q_start_idx = day_to_idx[query_df["Date"].iloc[0]]
    q_end_idx = day_to_idx[query_df["Date"].iloc[-1]]

    max_start_idx = len(trading_days) - (n + forward_days)
    if max_start_idx <= 0:
        raise RuntimeError("Dataset too small for requested query window + forward tail")

    query_prices = np.asarray(query_df["Close"].to_numpy(), dtype=np.float64)
    q_z = znormalize(query_prices)
    r = max(5, int(0.05 * n))
    U, L = compute_envelope(q_z, r)

    closes = np.asarray(df["Close"].to_numpy(), dtype=np.float64)
    T = closes.shape[0]

    best_dist = np.inf
    best_start_idx = -1
    best_tiebreak = -1

    query_mid = (q_start_idx + q_end_idx) // 2

    q_std = float(query_prices.std())
    candidate_starts = range(0, max_start_idx + 1)
    candidate_starts = [s for s in candidate_starts if STD_LO * q_std <= query_prices[s: s + n].std() <= STD_HI * q_std]

    for start_idx in candidate_starts:
        end_idx = start_idx + n - 1
        forward_end_idx = end_idx + forward_days
        if forward_end_idx >= T:
            break

        overlaps = not (forward_end_idx < q_start_idx or start_idx > q_end_idx)
        if overlaps:
            continue

        c = closes[start_idx : start_idx + n]
        c_z = znormalize(c)

        lb = lb_keogh(c_z, U, L)
        if lb >= best_dist:
            continue

        d = dtw_sakoe_chiba(c_z, q_z, r, cutoff=best_dist)
        if d < best_dist:
            best_dist = d
            best_start_idx = start_idx
            best_tiebreak = abs(start_idx - query_mid)
        elif d == best_dist:
            tb = abs(start_idx - query_mid)
            if tb > best_tiebreak:
                best_start_idx = start_idx
                best_tiebreak = tb

    if best_start_idx < 0 or not np.isfinite(best_dist):
        raise RuntimeError("Failed to find a valid DTW match window")

    match_slice = df.iloc[best_start_idx : best_start_idx + n + forward_days][
        ["Date", "Close"]
    ].copy()
    match_slice = match_slice.dropna(subset=["Close"]).reset_index(drop=True)
    if len(match_slice) != n + forward_days:
        raise RuntimeError("Best match slice did not have expected length")

    aligned_end_date = match_slice["Date"].iloc[n - 1]
    forward_end_date = match_slice["Date"].iloc[-1]

    query = QueryPayload(
        start_date=query_df["Date"].iloc[0].isoformat(),
        end_date=query_df["Date"].iloc[-1].isoformat(),
        dates=[d.isoformat() for d in query_df["Date"].tolist()],
        prices=[float(x) for x in query_df["Close"].tolist()],
    )

    match = MatchPayload(
        start_date=match_slice["Date"].iloc[0].isoformat(),
        aligned_end_date=aligned_end_date.isoformat(),
        forward_end_date=forward_end_date.isoformat(),
        dates=[d.isoformat() for d in match_slice["Date"].tolist()],
        prices=[float(x) for x in match_slice["Close"].tolist()],
    )

    t0_price = float(match_slice["Close"].iloc[n - 1])

    def _ret(k: int) -> float:
        return float(match_slice["Close"].iloc[n - 1 + k] / t0_price - 1.0)

    forward_returns = ForwardReturns(
        t1m=_ret(21),
        t3m=_ret(63),
        t6m=_ret(126),
        t9m=_ret(189),
        t1y=_ret(252),
        t2y=_ret(504),
        t3y=_ret(756),
    )

    return MatchResponse(
        n=n,
        forward_days=forward_days,
        query=query,
        match=match,
        forward_returns=forward_returns,
        dtw_distance=float(best_dist),
    )