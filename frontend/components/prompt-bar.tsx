"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  loading: boolean
  onRun: (prompt: string) => void
}

export function PromptBar({ loading, onRun }: Props) {
  const [prompt, setPrompt] = useState(
    "What is the S&P 500's current pattern like and what happened next in the past?"
  )

  const submit = useCallback(() => {
    onRun(prompt)
  }, [onRun, prompt])

  return (
    <div className="flex items-stretch gap-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
        spellCheck={false}
        className="h-11 w-full min-w-0 border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-white/50"
        placeholder="DESCRIBE THE QUERY WINDOW (E.G. 'JAN 2025 THROUGH NOW')"
      />
      <Button
        type="button"
        disabled={loading}
        onClick={submit}
        className="h-11 shrink-0 rounded-none border border-border bg-background px-4 font-mono text-xs tracking-widest text-foreground hover:bg-white/5 disabled:opacity-60"
        variant="outline"
      >
        {loading ? "MATCHING..." : "[ EXECUTE ]"}
      </Button>
    </div>
  )
}
