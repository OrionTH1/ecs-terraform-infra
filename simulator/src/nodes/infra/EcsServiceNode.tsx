import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EcsServiceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { EcsServiceIcon } from '../shared/icons/EcsServiceIcon'

export function EcsServiceNode({ data }: NodeProps<EcsServiceFlowNode>) {
  return (
    <NodeCard variant="infra" icon={<EcsServiceIcon />} title={data.label} tooltip={data.tooltip} status={data.status}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <span className="font-mono text-[13px] font-medium text-fg-muted">— tasks</span>
    </NodeCard>
  )
}
