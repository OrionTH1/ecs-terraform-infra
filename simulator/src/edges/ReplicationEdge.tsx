import { type EdgeProps } from '@xyflow/react'
import { pathElementId } from '../simulation/packets'
import type { ReplicationEdge as ReplicationEdgeType } from '../types/edge-data'

const LABEL_GAP = 10

export function ReplicationEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<ReplicationEdgeType>) {
  const isActive = data?.isActive ?? false

  return (
    <g className="edge-fade-in">
      <path
        id={pathElementId(id)}
        d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        strokeOpacity={isActive ? 0.9 : 0.3}
        className={`stroke-border-interaction ${isActive ? 'replication-dash' : ''}`}
      />
      <text
        x={sourceX + LABEL_GAP}
        y={(sourceY + targetY) / 2}
        textAnchor="start"
        dominantBaseline="central"
        className="fill-fg-muted font-sans text-[9px] font-medium uppercase tracking-wider"
      >
        page cache
      </text>
    </g>
  )
}
