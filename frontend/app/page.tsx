"use client"

import { BrutalistChart } from "@/components/chart"
import { ForwardReturnsStrip } from "@/components/forward-returns"
import { PromptBar } from "@/components/prompt-bar"
import { useHistoric } from "@/hooks/use-historic"
import { useMatch } from "@/hooks/use-match"

export default function Page() {
  const { data, loading, error, run } = useMatch()
  const {
    historic,
    loading: historicLoading,
    error: historicError,
  } = useHistoric()

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-xs font-semibold tracking-widest uppercase">
          S&amp;P500 PATTERN MATCHER
        </div>
        <div className="flex items-center gap-3 text-[10px] tracking-widest text-white/70 uppercase">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block size-2 rounded-none bg-white/70" />
            LOCALHOST
          </span>
        </div>
      </header>

      <main className="p-4">
        <div className="grid h-full grid-rows-[1fr_auto_auto] gap-2">
          <div className="relative overflow-hidden border border-border">
            {data && historic ? (
              <BrutalistChart
                n={data.n}
                historic={historic}
                query={data.query}
                match={{
                  dates: data.match.dates,
                  prices: data.match.prices,
                  aligned_end_date: data.match.aligned_end_date,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <div className="max-w-xl text-center text-xs leading-relaxed text-white/70">
                  {historicLoading ? (
                    <>LOADING HISTORIC SERIES…</>
                  ) : (
                    <>
                      ENTER A DATE RANGE PROMPT (E.G. &quot;JAN 2025 THROUGH
                      NOW&quot;) THEN EXECUTE TO OVERLAY TODAY&apos;S PATTERN
                      AGAINST ITS NEAREST-NEIGHBOR DTW MATCH + FORWARD YEARS.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-7 items-center justify-between border border-border px-3 text-[10px] tracking-widest text-white/70 uppercase">
            {data ? (
              <>
                <div className="truncate">
                  QUERY {data.query.start_date} → {data.query.end_date} N=
                  {data.n}
                </div>
                <div className="truncate">
                  MATCH {data.match.start_date} → {data.match.aligned_end_date}{" "}
                  FORWARD → {data.match.forward_end_date} DTW=
                  {data.dtw_distance.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="truncate">READY</div>
            )}
          </div>

          {data ? <ForwardReturnsStrip returns={data.forward_returns} /> : null}

          {error || historicError ? (
            <div className="border border-border px-3 py-2 text-xs text-white/80">
              ERROR: {error ?? historicError}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-border px-4 py-3">
        <PromptBar loading={loading} onRun={run} />
      </footer>
    </div>
  )
}
