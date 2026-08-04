import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface TargetUtilizationProps {
  perTask: number | null
  target: number
}

export function TargetUtilization({ perTask, target }: TargetUtilizationProps) {
  const display = useAnimatedNumber(perTask ?? 0)
  const isOverTarget = perTask !== null && perTask > target
  const fill = perTask !== null && target > 0 ? Math.min(perTask / target, 1) * 100 : 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        {perTask === null ? (
          <span className="font-mono text-[11px] text-status-error">no healthy tasks</span>
        ) : (
          <span className="font-mono text-[11px] tabular-nums text-fg-muted">
            <span className={isOverTarget ? 'text-status-warning' : 'text-fg'}>{display}</span>
            {' / '}
            {target}
          </span>
        )}
        <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">per task</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full transition-[width,background-color] duration-300 ${
            isOverTarget ? 'bg-status-warning' : 'bg-border-interaction'
          }`}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  )
}
