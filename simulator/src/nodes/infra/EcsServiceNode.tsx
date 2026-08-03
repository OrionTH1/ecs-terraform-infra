import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EcsServiceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { EcsServiceIcon } from '../shared/icons/EcsServiceIcon'

export function EcsServiceNode({ data }: NodeProps<EcsServiceFlowNode>) {
  return (
    <NodeCard variant="infra" icon={<EcsServiceIcon />} title={data.label} tooltip={data.tooltip} status={data.status}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[13px] font-medium text-fg-muted">{data.requestsPerSecond} req/s</span>
        <span className="font-mono text-[11px] text-fg-muted">
          {data.healthyTaskCount}/{data.totalTaskCount} healthy
        </span>
      </div>
    </NodeCard>
  )
}
