import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { AlbFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { LoadBalancerIcon } from '../shared/icons/LoadBalancerIcon'

export function AlbNode({ data }: NodeProps<AlbFlowNode>) {
  return (
    <NodeCard variant="infra" icon={<LoadBalancerIcon />} title={data.label} tooltip={data.tooltip} status={data.status}>
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
    </NodeCard>
  )
}
