import { p50Ms } from '../../simulation/latency'
import { LATENCY_ERROR_MS, LATENCY_WARNING_MS } from '../../simulation/simulation-config'

export type LatencyTone = 'idle' | 'warning' | 'error'

export function latencyTone(meanMs: number): LatencyTone {
  const median = p50Ms(meanMs)
  if (median >= LATENCY_ERROR_MS) return 'error'
  if (median >= LATENCY_WARNING_MS) return 'warning'
  return 'idle'
}

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}
