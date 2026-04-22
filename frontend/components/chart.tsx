"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"

type Props = {
  n: number
  historic: { dates: string[]; prices: number[] }
  match: { dates: string[]; prices: number[]; aligned_end_date: string }
  query: { dates: string[]; prices: number[] }
}

function isoDateToUtcTimestamp(isoDate: string): UTCTimestamp {
  // The backend ships YYYY-MM-DD (no timezone). Treat as UTC midnight.
  const ms = Date.parse(`${isoDate}T00:00:00Z`)
  return Math.floor(ms / 1000) as UTCTimestamp
}

function formatIsoFromUtcTimestamp(t: UTCTimestamp): string {
  return new Date((t as number) * 1000).toISOString().slice(0, 10)
}

function formatPrice(x: number): string {
  // Keep it simple for now: terminal-ish, no currency symbol.
  return x.toFixed(2)
}

export function BrutalistChart({ n, historic, match, query }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const historicSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const querySeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const t0Ref = useRef<HTMLDivElement | null>(null)

  const queryIndexByTime = useMemo(() => {
    const m = new Map<UTCTimestamp, number>()
    const limit = Math.min(
      n,
      match.dates.length,
      query.dates.length,
      query.prices.length
    )
    for (let i = 0; i < limit; i++) {
      m.set(isoDateToUtcTimestamp(match.dates[i]), i)
    }
    return m
  }, [match.dates, n, query.dates.length, query.prices.length])

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
        timeVisible: true,
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

    const historicSeries = chart.addSeries(LineSeries, {
      color: "#ffffff",
      lineWidth: 2,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: true,
    })

    const querySeries = chart.addSeries(LineSeries, {
      color: "#ffb000",
      lineWidth: 2,
      priceScaleId: "left",
      lastValueVisible: true,
      priceLineVisible: true,
    })

    chartRef.current = chart
    historicSeriesRef.current = historicSeries
    querySeriesRef.current = querySeries

    return () => {
      chart.remove()
      chartRef.current = null
      historicSeriesRef.current = null
      querySeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const historicSeries = historicSeriesRef.current
    const querySeries = querySeriesRef.current
    if (!chart || !historicSeries || !querySeries) return

    const histLimit = Math.min(historic.dates.length, historic.prices.length)
    const histData: LineData[] = Array.from({ length: histLimit }, (_, i) => ({
      time: isoDateToUtcTimestamp(historic.dates[i]),
      value: historic.prices[i],
    }))

    const qLimit = Math.min(n, match.dates.length, query.prices.length)
    const qData: LineData[] = Array.from({ length: qLimit }, (_, i) => ({
      time: isoDateToUtcTimestamp(match.dates[i]),
      value: query.prices[i],
    }))

    historicSeries.setData(histData)
    querySeries.setData(qData)

    // Default view: show ~1 year before match window start through the full
    // forward tail (up to 3Y). The full historic series is still accessible by
    // scrolling/zooming left.
    if (match.dates.length > 0) {
      const matchStartTs = isoDateToUtcTimestamp(match.dates[0])
      const matchEndTs = isoDateToUtcTimestamp(
        match.dates[match.dates.length - 1]
      )
      const oneYearSecs = 365 * 24 * 60 * 60
      chart.timeScale().setVisibleRange({
        from: (matchStartTs - oneYearSecs) as UTCTimestamp,
        to: matchEndTs,
      })
    } else {
      chart.timeScale().fitContent()
    }

    const t0El = t0Ref.current
    const t0Time = isoDateToUtcTimestamp(match.aligned_end_date)
    const updateT0 = () => {
      if (!t0El) return
      const x = chart.timeScale().timeToCoordinate(t0Time)
      if (x == null) {
        t0El.style.display = "none"
        return
      }
      t0El.style.display = "block"
      t0El.style.left = `${x}px`
    }

    updateT0()

    const onRange = () => updateT0()
    chart.timeScale().subscribeVisibleTimeRangeChange(onRange)

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onRange)
    }
  }, [
    historic.dates,
    historic.prices,
    match.aligned_end_date,
    match.dates,
    n,
    query.prices,
  ])

  useEffect(() => {
    const chart = chartRef.current
    const historicSeries = historicSeriesRef.current
    const querySeries = querySeriesRef.current
    const tooltipEl = tooltipRef.current
    if (!chart || !historicSeries || !querySeries || !tooltipEl) return

    const onMove = (param: MouseEventParams<Time>) => {
      if (
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0 ||
        param.time == null
      ) {
        tooltipEl.style.display = "none"
        return
      }

      const t = param.time as UTCTimestamp
      const histDate = formatIsoFromUtcTimestamp(t)

      const histPoint = param.seriesData.get(historicSeries) as
        | LineData<Time>
        | undefined
      const qPoint = param.seriesData.get(querySeries) as
        | LineData<Time>
        | undefined

      const histValue =
        histPoint != null && typeof histPoint.value === "number"
          ? histPoint.value
          : null

      const qValue =
        qPoint != null && typeof qPoint.value === "number" ? qPoint.value : null

      const qIdx = queryIndexByTime.get(t)
      const qDate = qIdx != null ? query.dates[qIdx] : null

      tooltipEl.style.display = "block"
      tooltipEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:12px;">
          <div style="color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase;font-size:10px;">HISTORIC</div>
          <div style="color:rgba(255,255,255,0.95);font-size:12px;">${histDate}</div>
        </div>
        <div style="margin-top:6px;display:flex;justify-content:space-between;gap:12px;">
          <div style="color:var(--chart-historic);letter-spacing:0.12em;text-transform:uppercase;font-size:10px;">SPY</div>
          <div style="color:var(--chart-historic);font-size:12px;">${
            histValue == null ? "—" : formatPrice(histValue)
          }</div>
        </div>
        ${
          qIdx == null
            ? ""
            : `<div style="margin-top:8px;height:1px;background:rgba(255,255,255,0.12)"></div>
               <div style="margin-top:8px;display:flex;justify-content:space-between;gap:12px;">
                 <div style="color:rgba(255,176,0,0.75);letter-spacing:0.12em;text-transform:uppercase;font-size:10px;">QUERY</div>
                 <div style="color:rgba(255,255,255,0.95);font-size:12px;">${qDate ?? "—"}</div>
               </div>
               <div style="margin-top:6px;display:flex;justify-content:space-between;gap:12px;">
                 <div style="color:var(--chart-query);letter-spacing:0.12em;text-transform:uppercase;font-size:10px;">SPY</div>
                 <div style="color:var(--chart-query);font-size:12px;">${
                   qValue == null ? "—" : formatPrice(qValue)
                 }</div>
               </div>`
        }
      `

      const bounds = (
        containerRef.current as HTMLDivElement
      ).getBoundingClientRect()
      const w = tooltipEl.offsetWidth
      const h = tooltipEl.offsetHeight
      const pad = 12

      const x = Math.min(
        Math.max(param.point.x + pad, pad),
        bounds.width - w - pad
      )
      const y = Math.min(
        Math.max(param.point.y + pad, pad),
        bounds.height - h - pad
      )
      tooltipEl.style.left = `${x}px`
      tooltipEl.style.top = `${y}px`
    }

    chart.subscribeCrosshairMove(onMove)
    return () => chart.unsubscribeCrosshairMove(onMove)
  }, [query.dates, queryIndexByTime])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Axis captions (overlay) */}
      <div className="pointer-events-none absolute top-3 left-3 text-[10px] tracking-widest text-(--chart-historic) uppercase">
        HISTORIC S&amp;P500 — CLOSE (RIGHT / WHITE)
      </div>
      <div className="pointer-events-none absolute top-3 right-3 text-[10px] tracking-widest text-(--chart-query) uppercase">
        QUERY — CLOSE (LEFT / YELLOW)
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] tracking-widest text-white/60 uppercase">
        DATE (HISTORIC)
      </div>

      {/* Tooltip (crosshair) */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-20 hidden min-w-56 border border-white/20 bg-black/95 px-3 py-2 text-xs text-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
      ></div>

      {/* T0 divider */}
      <div
        ref={t0Ref}
        className="pointer-events-none absolute inset-y-0 hidden"
      >
        <div className="h-full w-px border-l border-dashed border-white/50" />
        <div className="absolute top-2 left-2 border border-white/40 bg-black px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-white/85 uppercase">
          T0
        </div>
      </div>
    </div>
  )
}
