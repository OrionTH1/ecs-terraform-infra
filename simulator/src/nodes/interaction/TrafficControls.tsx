import type { ReactNode } from 'react'
import { REQUEST_RATE_STEP } from '../../simulation/simulation-config'
import { TRAFFIC_PATTERNS } from '../../simulation/traffic-patterns'
import { Stepper } from '../shared/Stepper'
import type { TrafficPattern } from '../../types/node-data'

interface TrafficControlsProps {
  peakRequestsPerMinute: number
  requestsPerMinute: number
  pattern: TrafficPattern
  rateUnit: string
  summary?: ReactNode
  warning?: ReactNode
  onRateChange: (peakRequestsPerMinute: number) => void
  onPatternChange: (pattern: TrafficPattern) => void
}

export function TrafficControls({
  peakRequestsPerMinute,
  requestsPerMinute,
  pattern,
  rateUnit,
  summary,
  warning,
  onRateChange,
  onPatternChange,
}: TrafficControlsProps) {
  return (
    <>
      <Stepper value={peakRequestsPerMinute} step={REQUEST_RATE_STEP} unit={rateUnit} onChange={onRateChange} />

      {pattern === 'constant' ? null : (
        <span className="font-mono text-[11px] tabular-nums text-fg-muted">sending {requestsPerMinute} {rateUnit}</span>
      )}

      {summary}

      <div className="flex overflow-hidden rounded-md border border-border">
        {TRAFFIC_PATTERNS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`nodrag flex-1 cursor-pointer border-l border-border px-1 py-1.5 font-sans text-[10px] font-medium uppercase tracking-wider transition-colors duration-150 first:border-l-0 ${
              option.value === pattern
                ? 'bg-[rgba(59,130,246,0.18)] text-fg'
                : 'bg-surface text-fg-muted hover:bg-surface-raised hover:text-fg'
            }`}
            onClick={() => onPatternChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {warning}
    </>
  )
}
