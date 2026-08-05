import type { NodeProps } from '@xyflow/react'
import { TARGET_GROUP_HEADER_HEIGHT } from '../../canvas/initial-graph'
import type { TargetGroupFlowNode } from '../../types/node-data'
import { InfoTooltip } from '../shared/InfoTooltip'

export function TargetGroupNode({ data }: NodeProps<TargetGroupFlowNode>) {
  const hasNoTargets = data.registeredTargetCount === 0

  return (
    <div
      className={`pointer-events-none rounded-card border border-dashed transition-[width,height,border-color] duration-300 ${
        hasNoTargets ? 'border-status-error/60 bg-[rgba(239,68,68,0.04)]' : 'border-border-interaction/45 bg-[rgba(59,130,246,0.04)]'
      }`}
      style={{ width: data.width, height: data.height }}
    >
      <div
        className="pointer-events-auto flex items-center gap-1.5 px-3"
        style={{ height: TARGET_GROUP_HEADER_HEIGHT }}
      >
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{data.label}</span>
        <span
          className={`font-mono text-[10px] tabular-nums ${hasNoTargets ? 'text-status-error' : 'text-fg-muted'}`}
        >
          {data.registeredTargetCount} registered · {data.healthyTargetCount} healthy
        </span>
        <InfoTooltip text={data.tooltip} />
      </div>
    </div>
  )
}
