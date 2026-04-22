function formatPct(x: number): string {
  const pct = x * 100
  const abs = Math.abs(pct)
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : ""
  return `${sign}${abs.toFixed(2)}%`
}

function cellColor(x: number): string {
  if (x > 0) return "text-[var(--chart-up)]"
  if (x < 0) return "text-[var(--chart-down)]"
  return "text-white/80"
}

type Props = {
  returns: {
    t1m: number
    t3m: number
    t6m: number
    t9m: number
    t1y: number
    t2y: number
    t3y: number
  }
}

export function ForwardReturnsStrip({ returns }: Props) {
  const items = [
    { label: "1M", value: returns.t1m },
    { label: "3M", value: returns.t3m },
    { label: "6M", value: returns.t6m },
    { label: "9M", value: returns.t9m },
    { label: "1Y", value: returns.t1y },
    { label: "2Y", value: returns.t2y },
    { label: "3Y", value: returns.t3y },
  ] as const

  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-7">
      {items.map((it) => (
        <div key={it.label} className="bg-black px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
            {it.label}
          </div>
          <div className={`mt-1 text-lg font-semibold ${cellColor(it.value)}`}>
            {formatPct(it.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

