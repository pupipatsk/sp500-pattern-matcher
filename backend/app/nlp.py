from __future__ import annotations

import os
import re
from datetime import date, timedelta

from dotenv import load_dotenv
from pydantic import BaseModel

from .data import get_dataset_meta

load_dotenv()


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

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        # Minimal default if Gemini isn't configured.
        default_start = (today - timedelta(days=365)).isoformat()
        return default_start, today.isoformat()

    from google import genai
    from google.genai import types

    meta = get_dataset_meta()

    system = (
        "You are a financial time-series query parser for S&P 500 daily data.\n"
        "Return ONLY JSON matching the provided schema.\n"
        "Dates must be ISO format YYYY-MM-DD.\n"
        f"Today is {today.isoformat()}.\n"
        f"Dataset bounds: min_date={meta['min_date']}, max_date={meta['max_date']}.\n"
        "If the user says 'through now', use query_end_date = today.\n"
        "If the user does not provide an explicit start date, infer a reasonable one.\n"
        "Prefer longer windows (6-18 months) for 'current pattern' style prompts unless a shorter window is specified.\n"
    )

    client = genai.Client(api_key=api_key)
    res = client.models.generate_content(
        model="gemini-3.1-flash-lite-preview",
        contents=[
            types.Content(role="user", parts=[types.Part(text=prompt)]),
        ],
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=QueryRange,
            temperature=0,
        ),
    )

    # google-genai returns text; parse and validate defensively.
    text = getattr(res, "text", None) or ""
    try:
        parsed = QueryRange.model_validate_json(text)
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"Gemini returned invalid JSON: {text[:200]}") from e

    if not parsed.query_start_date or not parsed.query_end_date:
        raise RuntimeError(f"Gemini returned empty dates: {text[:200]}")

    return parsed.query_start_date, parsed.query_end_date
