import type { NodeProps } from '@xyflow/react'
import type { AuroraClusterFlowNode } from '../../types/node-data'
import { FrameSummary, NodeFrame } from '../shared/NodeFrame'

export function AuroraClusterNode({ data }: NodeProps<AuroraClusterFlowNode>) {
  return (
    <NodeFrame
      label={data.label}
      tooltip={data.tooltip}
      width={data.width}
      height={data.height}
      summary={<FrameSummary>writer + reader endpoints · 0–1 ACU</FrameSummary>}
    />
  )
}
