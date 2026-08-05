import { getBezierPath, type EdgeProps } from '@xyflow/react'
import { pathElementId } from '../simulation/packets'
import type { RequestFlowEdge as RequestFlowEdgeType } from '../types/edge-data'

const CORNER_RADIUS = 10

function lanePath(sourceX: number, sourceY: number, targetX: number, targetY: number, laneX: number): string {
  if (Math.abs(targetY - sourceY) < CORNER_RADIUS * 2) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  }

  const goingDown = targetY > sourceY
  const corner = goingDown ? CORNER_RADIUS : -CORNER_RADIUS

  return [
    `M ${sourceX} ${sourceY}`,
    `H ${laneX - CORNER_RADIUS}`,
    `Q ${laneX} ${sourceY} ${laneX} ${sourceY + corner}`,
    `V ${targetY - corner}`,
    `Q ${laneX} ${targetY} ${laneX + CORNER_RADIUS} ${targetY}`,
    `H ${targetX}`,
  ].join(' ')
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
  const [bezier] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const path = data?.laneX === undefined ? bezier : lanePath(sourceX, sourceY, targetX, targetY, data.laneX)
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
