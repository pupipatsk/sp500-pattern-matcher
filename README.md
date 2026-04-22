# sp500-pattern-matcher

Time Series Mining and Knowledge Discovery Final Project

Example query:

- Regex: "last 2 years"
- GeminiAPI: "What is the S&P 500's current pattern like and what happened next in the past?"

## Dev setup

This repo contains:

- **Frontend**: Next.js + Tailwind (`frontend/`, runs on `localhost:3000`)
- **Backend**: FastAPI (`backend/`, runs on `localhost:8000`)

## Backend (FastAPI)

```bash
cd backend
cp .env.example .env   # set GEMINI_API_KEY=... inside
uv sync
```

Set `GEMINI_API_KEY` in `backend/.env` (required for best parsing). If it is missing, the backend falls back to a simple regex / default range.

Run:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## Frontend (Next.js)

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`, enter a prompt like:

- `Jan 2025 through now, what happened next historically?`
- `last 180 days`
