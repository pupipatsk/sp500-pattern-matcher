export type MatchResponse = {
  n: number
  forward_days: number
  dtw_distance: number
  forward_returns: {
    t1m: number
    t3m: number
    t6m: number
    t9m: number
    t1y: number
    t2y: number
    t3y: number
  }
  query: {
    start_date: string
    end_date: string
    dates: string[]
    prices: number[]
  }
  match: {
    start_date: string
    aligned_end_date: string
    forward_end_date: string
    dates: string[]
    prices: number[]
  }
}

export type HistoricSeries = {
  dates: string[]
  prices: number[]
}

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:8000"
  )
}

export async function postMatch(prompt: string): Promise<MatchResponse> {
  const res = await fetch(`${getApiBaseUrl()}/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }

  return (await res.json()) as MatchResponse
}

export async function getHistoric(): Promise<HistoricSeries> {
  const res = await fetch(`${getApiBaseUrl()}/historic`, {
    method: "GET",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }

  return (await res.json()) as HistoricSeries
}

