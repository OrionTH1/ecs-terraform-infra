import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { REPLICATION_LANE_OFFSET } from '../canvas/initial-graph'
import { pathElementId } from '../simulation/packets'
import type { ReplicationEdge as ReplicationEdgeType } from '../types/edge-data'

const LABEL_DISTANCE_FROM_SOURCE = 34

export function ReplicationEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps<ReplicationEdgeType>) {
  const laneX = Math.max(sourceX, targetX) + REPLICATION_LANE_OFFSET

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
    centerX: laneX,
  })

  const isActive = data?.isActive ?? false

  return (
    <>
      <path
        id={pathElementId(id)}
        d={path}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        strokeOpacity={isActive ? 0.9 : 0.3}
        className="stroke-border-interaction"
      />
      <text
        x={laneX + 8}
        y={sourceY + LABEL_DISTANCE_FROM_SOURCE}
        textAnchor="start"
        dominantBaseline="central"
        className="fill-fg-muted font-sans text-[9px] font-medium uppercase tracking-wider"
      >
        replication
      </text>
    </>
  )
}
