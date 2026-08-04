import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AUTOSCALING } from '../../simulation/simulation-config'
import type { EcsServiceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { TargetUtilization } from '../shared/TargetUtilization'
import { EcsServiceIcon } from '../../icons'

export function EcsServiceNode({ data }: NodeProps<EcsServiceFlowNode>) {
  const perTask = data.healthyTaskCount > 0 ? Math.round(data.requestsPerMinute / data.healthyTaskCount) : null

  return (
    <NodeCard variant="infra" icon={<EcsServiceIcon />} title={data.label} tooltip={data.tooltip} status={data.status}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
      <div className="flex w-[186px] flex-col gap-2">
        <RateReadout value={data.requestsPerMinute} size="md" />
        <TargetUtilization perTask={perTask} target={AUTOSCALING.targetRequestsPerMinutePerTask} />
        <span className="font-mono text-[11px] text-fg-muted">
          {data.healthyTaskCount}/{data.totalTaskCount} healthy
        </span>
      </div>
    </NodeCard>
  )
}
