import { COLD_START_MS, TIME_SCALES } from '../simulation/simulation-config'
import { useSimulationStore } from '../store/useSimulationStore'

export function SpeedPanel() {
  const timeScale = useSimulationStore((state) => state.timeScale)
  const setTimeScale = useSimulationStore((state) => state.setTimeScale)

  const realSeconds = Math.round(COLD_START_MS / 1000)
  const shownSeconds = Math.round(COLD_START_MS / timeScale / 1000)

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
            className={`min-w-[42px] cursor-pointer rounded-md border px-2 py-1 font-mono text-[12px] tabular-nums transition-colors duration-150 ${
              scale === timeScale
                ? 'border-border-interaction bg-surface-raised text-fg'
                : 'border-border bg-surface text-fg-muted hover:border-border-interaction hover:text-fg'
            }`}
          >
            {scale}×
          </button>
        ))}
      </div>
      <span className="block px-0.5 pt-2.5 font-sans text-[11px] leading-snug text-fg-muted">
        Cold start {realSeconds}s on AWS, shown in {shownSeconds}s
      </span>
    </div>
  )
}
