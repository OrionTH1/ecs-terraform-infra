import { getBezierPath, type EdgeProps } from '@xyflow/react'
import { pathElementId } from '../simulation/packets'
import type { RequestFlowEdge as RequestFlowEdgeType } from '../types/edge-data'

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
  const isCarryingTraffic = (data?.requestsPerMinute ?? 0) > 0
  const isLit = data?.isSecurityGroupLit ?? false

  return (
    <path
      id={pathElementId(id)}
      d={path}
      pathLength={1}
      fill="none"
      strokeWidth={isLit ? 2.5 : 1.5}
      strokeOpacity={isLit || isCarryingTraffic ? 1 : 0.4}
      className={`edge-draw transition-[stroke,stroke-width] duration-150 ${
        isLit ? 'stroke-border-interaction' : 'stroke-border'
      }`}
    />
  )
}
