import { type EdgeProps } from '@xyflow/react'
import { REPLICATION_LANE_OFFSET } from '../canvas/initial-graph'
import { pathElementId } from '../simulation/packets'
import type { ReplicationEdge as ReplicationEdgeType } from '../types/edge-data'

const CORNER_RADIUS = 12
const LABEL_DISTANCE_FROM_SOURCE = 40

function replicationPath(sourceX: number, sourceY: number, targetX: number, targetY: number, laneX: number): string {
  return [
    `M ${sourceX} ${sourceY}`,
    `H ${laneX - CORNER_RADIUS}`,
    `Q ${laneX} ${sourceY} ${laneX} ${sourceY + CORNER_RADIUS}`,
    `V ${targetY - CORNER_RADIUS}`,
    `Q ${laneX} ${targetY} ${laneX - CORNER_RADIUS} ${targetY}`,
    `H ${targetX}`,
  ].join(' ')
}

export function ReplicationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<ReplicationEdgeType>) {
  const laneX = Math.max(sourceX, targetX) + REPLICATION_LANE_OFFSET
  const isActive = data?.isActive ?? false

  return (
    <>
      <path
        id={pathElementId(id)}
        d={replicationPath(sourceX, sourceY, targetX, targetY, laneX)}
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
