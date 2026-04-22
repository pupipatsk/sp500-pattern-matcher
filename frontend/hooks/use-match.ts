"use client"

import { useCallback, useState } from "react"
import { postMatch, type MatchResponse } from "@/lib/api"

export function useMatch() {
  const [data, setData] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (prompt: string) => {
    const p = prompt.trim()
    if (!p) return

    setLoading(true)
    setError(null)

    try {
      const next = await postMatch(p)
      setData(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, run }
}

