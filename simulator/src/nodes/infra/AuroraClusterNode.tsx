import type { NodeProps } from '@xyflow/react'
import type { AuroraClusterFlowNode } from '../../types/node-data'
import { FrameSummary, NodeFrame } from '../shared/NodeFrame'
import { AURORA_SERVERLESS } from '../../simulation/simulation-config'

export function AuroraClusterNode({ data }: NodeProps<AuroraClusterFlowNode>) {
  return (
    <NodeFrame
      label={data.label}
      tooltip={data.tooltip}
      width={data.width}
      height={data.height}
      summary={<FrameSummary>writer + reader endpoints · {AURORA_SERVERLESS.minAcu}–{AURORA_SERVERLESS.maxAcu} ACU</FrameSummary>}
    />
  )
}
