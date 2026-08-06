import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { useRecentChange } from '../../hooks/useRecentChange'

type RateReadoutSize = 'sm' | 'md'

interface RateReadoutProps {
  value: number
  size?: RateReadoutSize
}

const VALUE_SIZE: Record<RateReadoutSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[15px]',
}

export function RateReadout({ value, size = 'sm' }: RateReadoutProps) {
  const display = useAnimatedNumber(value)
  const isChanging = useRecentChange(value)

  const isIdle = display === 0

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={`font-mono font-medium tabular-nums transition-[color,transform] duration-300 ${VALUE_SIZE[size]} ${
          isChanging ? 'text-border-interaction' : isIdle ? 'text-fg-muted' : 'text-fg'
        }`}
        style={{ transformOrigin: 'right center' }}
      >
        {display}
      </span>
      <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">req/min</span>
    </span>
  )
}
