from __future__ import annotations

from fastapi import APIRouter

from .data import get_dataset_meta
from .match import build_match_response
from .models import HealthResponse, MatchRequest, MatchResponse
from .nlp import parse_query_range

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    meta = get_dataset_meta()
    return HealthResponse(ok=True, **meta)


@router.post("/match", response_model=MatchResponse)
def match(req: MatchRequest) -> MatchResponse:
    query_start_date, query_end_date = parse_query_range(req.prompt)
    return build_match_response(query_start_date=query_start_date, query_end_date=query_end_date)
