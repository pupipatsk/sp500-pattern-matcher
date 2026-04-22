from __future__ import annotations

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)


class SeriesPayload(BaseModel):
    dates: list[str]
    prices: list[float]


class QueryPayload(SeriesPayload):
    start_date: str
    end_date: str


class MatchPayload(SeriesPayload):
    start_date: str
    aligned_end_date: str
    forward_end_date: str


class ForwardReturns(BaseModel):
    t1m: float
    t3m: float
    t6m: float
    t1y: float


class MatchResponse(BaseModel):
    n: int
    forward_days: int
    query: QueryPayload
    match: MatchPayload
    forward_returns: ForwardReturns
    dtw_distance: float


class HealthResponse(BaseModel):
    ok: bool
    rows: int
    min_date: str
    max_date: str
