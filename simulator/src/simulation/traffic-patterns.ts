import {
  BURST_FLOOR_FRACTION,
  BURST_PEAK_FRACTION,
  BURST_PERIOD_MS,
  RAMP_DURATION_MS,
} from './simulation-config'
import type { TrafficPattern } from '../types/node-data'

export const TRAFFIC_PATTERNS: { value: TrafficPattern; label: string }[] = [
  { value: 'constant', label: 'Const' },
  { value: 'ramp', label: 'Ramp' },
  { value: 'burst', label: 'Burst' },
]

export function effectiveRequestRate(pattern: TrafficPattern, peak: number, elapsedMs: number, rampFrom: number): number {
  if (pattern === 'constant') return peak

  if (pattern === 'ramp') {
    const progress = Math.min(Math.max(elapsedMs, 0) / RAMP_DURATION_MS, 1)
    return Math.round(rampFrom + (peak - rampFrom) * progress)
  }

  const phase = (Math.max(elapsedMs, 0) % BURST_PERIOD_MS) / BURST_PERIOD_MS
  return Math.round(peak * (phase < BURST_PEAK_FRACTION ? 1 : BURST_FLOOR_FRACTION))
}
