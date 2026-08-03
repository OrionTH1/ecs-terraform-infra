import type { NodeProps } from '@xyflow/react'
import type { NodeStatus } from '../../types/node-data'
import type { TaskFlowNode, TaskStatus } from '../../types/task-data'
import { NodeCard } from '../shared/NodeCard'
import { EcsServiceIcon } from '../shared/icons/EcsServiceIcon'

const STATUS_LABEL: Record<TaskStatus, string> = {
  provisioning: 'Provisioning',
  starting: 'Starting',
  registering: 'Registering',
  healthy: 'Healthy',
  draining: 'Draining',
}

const STATUS_TO_CARD_STATUS: Record<TaskStatus, NodeStatus> = {
  provisioning: 'warning',
  starting: 'warning',
  registering: 'warning',
  healthy: 'healthy',
  draining: 'error',
}

export function TaskNode({ data }: NodeProps<TaskFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={<EcsServiceIcon />}
      title={`Task ${data.taskNumber}`}
      tooltip="One ECS Fargate task behind the ALB target group."
      status={STATUS_TO_CARD_STATUS[data.status]}
    >
      <div className="flex min-w-[150px] flex-col gap-1.5">
        <span className="font-sans text-xs font-medium text-fg">{STATUS_LABEL[data.status]}</span>
        <div className="flex flex-col gap-0.5">
          {data.log.slice(-2).map((line, index) => (
            <span key={index} className="truncate font-mono text-[11px] text-fg-muted">
              {line}
            </span>
          ))}
        </div>
      </div>
    </NodeCard>
  )
}
