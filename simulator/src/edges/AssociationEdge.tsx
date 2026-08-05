import { getBezierPath, type EdgeProps } from '@xyflow/react'
import type { AssociationEdge as AssociationEdgeType } from '../types/edge-data'

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
