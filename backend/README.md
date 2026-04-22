# Backend (FastAPI)

## Setup

```bash
cp .env.example .env   # then set GEMINI_API_KEY=... inside .env
uv sync
```

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `POST /match` `{ "prompt": "..." }`
