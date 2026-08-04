import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { TRAFFIC_UPDATE_MS } from '../simulation/simulation-config'
import { effectiveRequestRate } from '../simulation/traffic-patterns'
import { useSimulationStore } from '../store/useSimulationStore'
import type { TrafficPattern } from '../types/node-data'

interface TrafficPatternArgs {
  nodeId: string
  pattern: TrafficPattern
  patternStartedAt: number
  peakRequestsPerMinute: number
  rampFromRequestsPerMinute: number
  requestsPerMinute: number
}

export function useTrafficPattern({
  nodeId,
  pattern,
  patternStartedAt,
  peakRequestsPerMinute,
  rampFromRequestsPerMinute,
  requestsPerMinute,
}: TrafficPatternArgs) {
  const { updateNodeData } = useReactFlow()
  const quantizedClock = useSimulationStore((state) => Math.floor(state.clock / TRAFFIC_UPDATE_MS))

  useEffect(() => {
    const elapsedMs = quantizedClock * TRAFFIC_UPDATE_MS - patternStartedAt
    const next = effectiveRequestRate(pattern, peakRequestsPerMinute, elapsedMs, rampFromRequestsPerMinute)

    if (next !== requestsPerMinute) updateNodeData(nodeId, { requestsPerMinute: next })
  }, [
    quantizedClock,
    pattern,
    patternStartedAt,
    peakRequestsPerMinute,
    rampFromRequestsPerMinute,
    requestsPerMinute,
    nodeId,
    updateNodeData,
  ])
}
