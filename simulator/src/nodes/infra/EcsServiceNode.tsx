import { Handle, Position, type NodeProps } from '@xyflow/react'
import { MANAGEMENT_HANDLE_LEFT_INSET } from '../../canvas/initial-graph'
import { AUTOSCALING } from '../../simulation/simulation-config'
import type { EcsServiceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { TargetUtilization } from '../shared/TargetUtilization'
import { EcsServiceIcon } from '../../icons'

export function EcsServiceNode({ data }: NodeProps<EcsServiceFlowNode>) {
  const perTask = data.healthyTaskCount > 0 ? Math.round(data.requestsPerMinute / data.healthyTaskCount) : null

  return (
    <NodeCard
      variant="infra"
      icon={<EcsServiceIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={
        <Handle
          type="source"
          position={Position.Bottom}
          id="manages-out"
          isConnectable={false}
          style={{ left: MANAGEMENT_HANDLE_LEFT_INSET }}
        />
      }
    >
      <div className="flex w-[186px] flex-col gap-2">
        <span className="font-mono text-[11px] text-fg-muted">tracking ALBRequestCountPerTarget</span>
        <TargetUtilization perTask={perTask} target={AUTOSCALING.targetRequestsPerMinutePerTask} />
        <span className="font-mono text-[11px] text-fg-muted">
          {data.healthyTaskCount}/{data.totalTaskCount} healthy
        </span>
      </div>
    </NodeCard>
  )
}
