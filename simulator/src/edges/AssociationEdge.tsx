import { getBezierPath, type EdgeProps } from '@xyflow/react'
import { MANAGEMENT_BUS_OFFSET } from '../canvas/initial-graph'
import type { AssociationEdge as AssociationEdgeType } from '../types/edge-data'

const CORNER_RADIUS = 9
const TRUNK_STUB = 20

function managementPath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  const busX = targetX - MANAGEMENT_BUS_OFFSET
  const turnY = sourceY + TRUNK_STUB

  return [
    `M ${sourceX} ${sourceY}`,
    `V ${turnY - CORNER_RADIUS}`,
    `Q ${sourceX} ${turnY} ${sourceX - CORNER_RADIUS} ${turnY}`,
    `H ${busX + CORNER_RADIUS}`,
    `Q ${busX} ${turnY} ${busX} ${turnY + CORNER_RADIUS}`,
    `V ${targetY - CORNER_RADIUS}`,
    `Q ${busX} ${targetY} ${busX + CORNER_RADIUS} ${targetY}`,
    `H ${targetX}`,
  ].join(' ')
}

export function AssociationEdge({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps<AssociationEdgeType>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const isActive = data?.isActive ?? false

  if (data?.variant === 'management') {
    return (
      <path
        d={data.routing === 'bus' ? managementPath(sourceX, sourceY, targetX, targetY) : path}
        fill="none"
        strokeWidth={1}
        strokeDasharray="3 5"
        strokeOpacity={isActive ? 0.9 : 0.3}
        className={isActive ? 'stroke-status-error' : 'stroke-border-interaction'}
      />
    )
  }

  return (
    <>
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        strokeOpacity={isActive ? 1 : 0.35}
        className={isActive ? 'stroke-status-warning acl-dash' : 'stroke-border'}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-fg-muted font-sans text-[9px] font-medium uppercase tracking-wider"
      >
        associated
      </text>
    </>
  )
}
