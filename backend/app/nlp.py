from __future__ import annotations

import json
import os
import re
from datetime import date, timedelta

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

from .data import get_dataset_meta

load_dotenv()

MODEL = os.getenv("VLLM_MODEL", "Qwen/Qwen3.5-2B")
ENDPOINT = os.getenv("VLLM_ENDPOINT", "http://localhost:9000/v1")


class QueryRange(BaseModel):
    query_start_date: str
    query_end_date: str


_LAST_RE = re.compile(
    r"\blast\s+(?P<n>\d+)\s*(?P<unit>day|days|week|weeks|month|months|year|years)\b",
    re.IGNORECASE,
)


def _parse_last_n(prompt: str, *, today: date) -> QueryRange | None:
    m = _LAST_RE.search(prompt)
    if not m:
        return None

    n = int(m.group("n"))
    unit = m.group("unit").lower()

    if unit.startswith("day"):
        delta = timedelta(days=n)
    elif unit.startswith("week"):
        delta = timedelta(days=7 * n)
    elif unit.startswith("month"):
        delta = timedelta(days=30 * n)
    elif unit.startswith("year"):
        delta = timedelta(days=365 * n)
    else:
        return None

    return QueryRange(
        query_start_date=(today - delta).isoformat(),
        query_end_date=today.isoformat(),
    )


def parse_query_range(prompt: str) -> tuple[str, str]:
    """
    Returns (query_start_date, query_end_date) as ISO YYYY-MM-DD strings.
    """
    today = date.today()

    regex = _parse_last_n(prompt, today=today)
    if regex is not None:
        return regex.query_start_date, regex.query_end_date

    meta = get_dataset_meta()

    system = (
        "You are a financial time-series query parser for S&P 500 daily data.\n"
        "Return ONLY valid JSON with keys query_start_date and query_end_date.\n"
        "Dates must be ISO format YYYY-MM-DD.\n"
        f"Today is {today.isoformat()}.\n"
        f"Dataset bounds: min_date={meta['min_date']}, max_date={meta['max_date']}.\n"
        "If the user says 'through now', use query_end_date = today.\n"
        "If the user does not provide an explicit start date, infer a reasonable one.\n"
        "Prefer longer windows (6-18 months) for 'current pattern' style prompts unless a shorter window is specified.\n"
    )

    client = OpenAI(base_url=ENDPOINT, api_key="not-needed")
    res = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    text = res.choices[0].message.content or ""
    try:
        parsed = QueryRange.model_validate(json.loads(text))
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"vLLM returned invalid JSON: {text[:200]}") from e

    if not parsed.query_start_date or not parsed.query_end_date:
        raise RuntimeError(f"vLLM returned empty dates: {text[:200]}")
    print(f"Parsed query range: {parsed.query_start_date} to {parsed.query_end_date}")
    return parsed.query_start_date, parsed.query_end_date
