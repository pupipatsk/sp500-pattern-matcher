"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts"

type Props = {
  n: number
  query: number[]
  match: number[]
}

function toUtcTimestamp(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp
}

function makeSyntheticTime(i: number): UTCTimestamp {
  const d = new Date(Date.UTC(2000, 0, 1))
  d.setUTCDate(d.getUTCDate() + i)
  return toUtcTimestamp(d)
}

export function BrutalistChart({ n, query, match }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const querySeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const matchSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)

  const total = match.length
  const t0Pct = useMemo(() => {
    if (total <= 1 || n <= 0) return 0
    const denom = total - 1
    const idx = Math.max(0, Math.min(n - 1, denom))
    return (idx / denom) * 100
  }, [n, total])

  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#000" },
        textColor: "rgba(255,255,255,0.85)",
        fontFamily:
          "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.20)",
        visible: true,
        ticksVisible: true,
      },
      leftPriceScale: {
        borderColor: "rgba(255,255,255,0.20)",
        visible: true,
        ticksVisible: true,
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.20)",
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.20)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#000",
        },
        horzLine: {
          color: "rgba(255,255,255,0.20)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#000",
        },
      },
    })

    const querySeries = chart.addSeries(LineSeries, {
      color: "rgba(255,255,255,0.95)",
      lineWidth: 2,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: true,
    })

    const matchSeries = chart.addSeries(LineSeries, {
      color: "rgba(255,200,64,0.95)",
      lineWidth: 2,
      priceScaleId: "left",
      lastValueVisible: true,
      priceLineVisible: true,
    })

    chartRef.current = chart
    querySeriesRef.current = querySeries
    matchSeriesRef.current = matchSeries

    const ro = new ResizeObserver(() => {
      chart.timeScale().fitContent()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      querySeriesRef.current = null
      matchSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const querySeries = querySeriesRef.current
    const matchSeries = matchSeriesRef.current
    if (!chart || !querySeries || !matchSeries) return

    const qData: LineData[] = query.map((v, i) => ({
      time: makeSyntheticTime(i),
      value: v,
    }))

    const mData: LineData[] = match.map((v, i) => ({
      time: makeSyntheticTime(i),
      value: v,
    }))

    querySeries.setData(qData)
    matchSeries.setData(mData)
    chart.timeScale().fitContent()
  }, [query, match])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* T0 divider */}
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `${t0Pct}%` }}
      >
        <div className="h-full w-px border-l border-dashed border-white/30" />
        <div className="absolute left-2 top-2 text-[10px] uppercase tracking-widest text-white/70">
          T0
        </div>
      </div>
    </div>
  )
}

