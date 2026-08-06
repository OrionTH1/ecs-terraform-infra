import { p50Ms, p99Ms } from '../../simulation/latency'
import { formatDuration, latencyTone, type LatencyTone } from './latency-format'

type LatencyReadoutSize = 'sm' | 'md'

interface LatencyReadoutProps {
  meanMs: number
  size?: LatencyReadoutSize
  showTail?: boolean
}

const VALUE_SIZE: Record<LatencyReadoutSize, string> = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
}

const TONE_CLASS: Record<LatencyTone, string> = {
  idle: 'text-fg',
  warning: 'text-status-warning',
  error: 'text-status-error',
}

export function LatencyReadout({ meanMs, size = 'sm', showTail = true }: LatencyReadoutProps) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-mono tabular-nums ${VALUE_SIZE[size]}`}>
      <span className={`font-medium transition-colors duration-500 ${TONE_CLASS[latencyTone(meanMs)]}`}>
        {formatDuration(p50Ms(meanMs))}
      </span>
      <span className="text-[10px] text-fg-muted">p50</span>
      {showTail ? (
        <>
          <span className="text-fg-muted">·</span>
          <span className="text-fg-muted">{formatDuration(p99Ms(meanMs))}</span>
          <span className="text-[10px] text-fg-muted">p99</span>
        </>
      ) : null}
    </span>
  )
}
