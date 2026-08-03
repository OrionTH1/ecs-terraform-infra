import { getBezierPath, type EdgeProps } from '@xyflow/react'
import type { RequestFlowEdge as RequestFlowEdgeType } from '../types/edge-data'

const MIN_DURATION_MS = 300
const MAX_DURATION_MS = 1800
const RPS_SOFTNESS = 50
const MAX_DOTS = 3

/** Speed scales with rps but is clamped, so a DDoS-scale rps never spawns faster-than-readable motion. */
function flowDurationMs(rps: number) {
  const duration = MAX_DURATION_MS / (1 + rps / RPS_SOFTNESS)
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, duration))
}

/** Dot count is bucketed, not 1:1 with rps — a DDoS-scale rps still renders a handful of dots, not thousands. */
function dotCount(rps: number) {
  if (rps <= 0) return 0
  if (rps <= 50) return 1
  if (rps <= 400) return 2
  return MAX_DOTS
}

export function RequestFlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps<RequestFlowEdgeType>) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const rps = data?.rps ?? 0
  const duration = flowDurationMs(rps)
  const dots = dotCount(rps)
  const pathId = `flow-path-${id}`

  return (
    <>
      <path id={pathId} d={path} fill="none" strokeWidth={1.5} className="stroke-border" />
      {Array.from({ length: dots }, (_, index) => (
        <circle key={index} r={3} className="fill-border-interaction">
          <animateMotion dur={`${duration}ms`} begin={`${(duration / dots) * index}ms`} repeatCount="indefinite">
            <mpath xlinkHref={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}
    </>
  )
}
