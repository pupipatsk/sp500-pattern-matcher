"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TERMINAL_SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const

function TerminalSpinner() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = window.setInterval(
      () => setFrame((n) => (n + 1) % TERMINAL_SPINNER_FRAMES.length),
      90
    )
    return () => window.clearInterval(id)
  }, [])

  return (
    <span
      className="inline-flex min-w-[1.25em] items-center justify-center font-mono text-lg leading-none"
      aria-hidden
    >
      {TERMINAL_SPINNER_FRAMES[frame]}
    </span>
  )
}

type Props = {
  loading: boolean
  onRun: (prompt: string) => void
}

export function PromptBar({ loading, onRun }: Props) {
  const [prompt, setPrompt] = useState(
    "Compare today’s pattern with history to see what followed."
  )

  const submit = useCallback(() => {
    onRun(prompt)
  }, [onRun, prompt])

  const isEmpty = prompt.trim() === ""

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 transition-shadow duration-150",
        isEmpty && "ring-2 ring-ring/30"
      )}
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
        spellCheck={false}
        className={cn(
          "h-11 w-full min-w-0 border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground",
          "focus:border-white/50",
          isEmpty ? "border-white/50" : "border-border"
        )}
        placeholder="DESCRIBE THE QUERY WINDOW (E.G. 'last 2 years')"
      />
      <Button
        type="button"
        disabled={loading}
        aria-busy={loading}
        onClick={submit}
        className={cn(
          "h-11 shrink-0 gap-2 rounded-none border bg-background px-4 font-mono text-xs tracking-widest text-foreground hover:bg-white/5 disabled:opacity-60",
          isEmpty ? "border-white/50" : "border-border"
        )}
        variant="outline"
      >
        {loading ? (
          <>
            <TerminalSpinner />
            MATCHING
          </>
        ) : (
          "[ EXECUTE ]"
        )}
      </Button>
    </div>
  )
}
