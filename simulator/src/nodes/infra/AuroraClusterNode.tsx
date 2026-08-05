import type { NodeProps } from '@xyflow/react'
import { AURORA_FRAME_HEADER_HEIGHT } from '../../canvas/initial-graph'
import type { AuroraClusterFlowNode } from '../../types/node-data'
import { InfoTooltip } from '../shared/InfoTooltip'

export function AuroraClusterNode({ data }: NodeProps<AuroraClusterFlowNode>) {
  return (
    <div
      className="pointer-events-none rounded-card border border-dashed border-border-interaction/40 bg-[rgba(59,130,246,0.03)]"
      style={{ width: data.width, height: data.height }}
    >
      <div className="pointer-events-auto flex items-center gap-2 px-4" style={{ height: AURORA_FRAME_HEADER_HEIGHT }}>
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{data.label}</span>
        <span className="font-mono text-[10px] text-fg-muted">writer + reader endpoints · 0–1 ACU</span>
        <InfoTooltip text={data.tooltip} />
      </div>
    </div>
  )
}
