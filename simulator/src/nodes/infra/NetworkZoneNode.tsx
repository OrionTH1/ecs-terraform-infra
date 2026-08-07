import type { NodeProps } from '@xyflow/react'
import type { NetworkZoneFlowNode } from '../../types/node-data'
import { FrameSummary, NodeFrame } from '../shared/NodeFrame'

export function NetworkZoneNode({ data }: NodeProps<NetworkZoneFlowNode>) {
  return (
    <NodeFrame
      label={data.label}
      tooltip={data.tooltip}
      width={data.width}
      height={data.height}
      tone="ownership"
      summary={<FrameSummary>{data.summary}</FrameSummary>}
    />
  )
}
