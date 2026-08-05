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

  return (
    <path
      id={pathElementId(id)}
      d={path}
      fill="none"
      strokeWidth={1.5}
      strokeOpacity={isCarryingTraffic ? 1 : 0.4}
      className="stroke-border"
    />
  )
}
