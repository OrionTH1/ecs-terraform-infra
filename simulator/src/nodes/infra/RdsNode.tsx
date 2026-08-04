import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { RdsFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { RdsIcon } from '../../icons'

export function RdsNode({ data }: NodeProps<RdsFlowNode>) {
  return (
    <NodeCard variant="infra" icon={<RdsIcon />} title={data.label} tooltip={data.tooltip} status={data.status}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <div className="flex w-[164px] flex-col gap-1">
        <RateReadout value={data.requestsPerMinute} />
      </div>
    </NodeCard>
  )
}
