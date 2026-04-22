"use client"

import { useEffect, useState } from "react"
import { getHistoric, type HistoricSeries } from "@/lib/api"

export function useHistoric() {
  const [historic, setHistoric] = useState<HistoricSeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const data = await getHistoric()
        if (!cancelled) setHistoric(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Request failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  return { historic, loading, error }
}

