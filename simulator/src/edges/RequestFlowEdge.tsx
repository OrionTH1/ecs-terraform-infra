import { getBezierPath, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { pathElementId } from '../simulation/packets'
import type { RequestFlowEdge as RequestFlowEdgeType } from '../types/edge-data'

const LANE_CORNER_RADIUS = 12

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
  const geometry = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }

  const [path] =
    data?.laneX === undefined
      ? getBezierPath(geometry)
      : getSmoothStepPath({ ...geometry, borderRadius: LANE_CORNER_RADIUS, centerX: data.laneX })

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
