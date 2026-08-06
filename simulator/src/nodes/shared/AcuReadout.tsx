import { AURORA_SERVERLESS } from '../../simulation/simulation-config'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface AcuReadoutProps {
  acu: number
}

const SCALE = 10

export function AcuReadout({ acu }: AcuReadoutProps) {
  const display = useAnimatedNumber(Math.round(acu * SCALE)) / SCALE
  const isAtCeiling = acu >= AURORA_SERVERLESS.maxAcu
  const fill = (acu / AURORA_SERVERLESS.maxAcu) * 100

  return (
    <div className="flex flex-col gap-1 border-t border-border pt-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] tabular-nums text-fg-muted">
          <span className={isAtCeiling ? 'text-status-warning' : 'text-fg'}>{display.toFixed(1)}</span>
          {' / '}
          {AURORA_SERVERLESS.maxAcu}
        </span>
        <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">ACU</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full transition-[width,background-color] duration-700 ${
            isAtCeiling ? 'bg-status-warning' : 'bg-border-interaction'
          }`}
          style={{ width: `${Math.min(fill, 100)}%` }}
        />
      </div>
    </div>
  )
}
