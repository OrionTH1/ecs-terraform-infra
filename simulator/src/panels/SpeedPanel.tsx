import { COLD_START_MS, SCALE_IN_LATENCY_MS, TIME_SCALES } from '../simulation/simulation-config'
import { useSimulationStore } from '../store/useSimulationStore'

function formatAwsDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  return seconds < 120 ? `${seconds}s` : `${Math.round(seconds / 60)}min`
}

function formatShownDuration(ms: number, timeScale: number): string {
  const seconds = ms / timeScale / 1000
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`
}

export function SpeedPanel() {
  const timeScale = useSimulationStore((state) => state.timeScale)
  const setTimeScale = useSimulationStore((state) => state.setTimeScale)

  const rows = [
    { label: 'Cold start', ms: COLD_START_MS },
    { label: 'Scale-in', ms: SCALE_IN_LATENCY_MS },
  ]

  return (
    <div className="rounded-card border border-border bg-surface p-2.5 shadow-card">
      <span className="block px-0.5 pb-2 pt-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
        Simulation speed
      </span>
      <div className="flex gap-1">
        {TIME_SCALES.map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => setTimeScale(scale)}
            className={`min-w-[40px] flex-1 cursor-pointer rounded-md border px-1.5 py-1 font-mono text-[12px] tabular-nums press-ack ${
              scale === timeScale
                ? 'border-border-interaction bg-surface-raised text-fg'
                : 'border-border bg-surface text-fg-muted hover:border-border-interaction hover:text-fg'
            }`}
          >
            {scale}×
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5 pt-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <span className="font-sans text-[11px] text-fg-muted">{row.label}</span>
            <span className="font-mono text-[11px] tabular-nums text-fg-muted">
              {formatAwsDuration(row.ms)} → {formatShownDuration(row.ms, timeScale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
