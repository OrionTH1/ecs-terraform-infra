import { useEffect, useRef, useState } from 'react'
import { useApplyLog, type ApplyLineKind } from '../hooks/useApplyLog'
import { useSimulationStore } from '../store/useSimulationStore'

const DISMISS_DELAY_MS = 4000

const LINE_CLASS: Record<ApplyLineKind, string> = {
  creating: 'text-fg-muted',
  progress: 'text-fg-muted/70',
  complete: 'text-status-healthy',
  summary: 'text-fg font-medium',
}

export function ApplyConsole() {
  const lines = useApplyLog()
  const isApplyComplete = useSimulationStore((state) => state.isApplyComplete)
  const [isDismissed, setIsDismissed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [lines])

  useEffect(() => {
    if (!isApplyComplete) return

    const timeoutId = setTimeout(() => setIsDismissed(true), DISMISS_DELAY_MS)
    return () => clearTimeout(timeoutId)
  }, [isApplyComplete])

  if (lines.length === 0 || isDismissed) return null

  return (
    <div
      className="absolute right-4 bottom-4 z-10 w-[420px] rounded-card border border-border bg-surface/95 shadow-card transition-opacity duration-700"
      style={{ opacity: isApplyComplete ? 0.85 : 1 }}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[11px] text-fg-muted">$</span>
        <span className="font-mono text-[11px] text-fg">terraform apply</span>
      </div>
      <div ref={scrollRef} className="max-h-[168px] overflow-y-auto px-3 py-2">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`truncate font-mono text-[11px] leading-[1.6] ${LINE_CLASS[line.kind]}`}
            style={{ animation: 'log-entry-in 200ms ease-out' }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}
