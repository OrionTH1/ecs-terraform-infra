import { Handle, Position, type NodeProps } from '@xyflow/react'
import { TaskDebugLog } from './TaskDebugLog'
import { useSimulationStore } from '../../store/useSimulationStore'
import type { NodeStatus } from '../../types/node-data'
import type { TaskFlowNode, TaskStatus } from '../../types/task-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { StageProgress } from '../shared/StageProgress'
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

export function TaskNode({ id, data }: NodeProps<TaskFlowNode>) {
  const isExpanded = useSimulationStore((state) => state.expandedTaskIds.includes(id))
  const toggleTaskLog = useSimulationStore((state) => state.toggleTaskLog)

  return (
    <NodeCard
      variant="infra"
      icon={<EcsServiceIcon />}
      title={`Task ${data.taskNumber}`}
      tooltip="One ECS Fargate task behind the ALB target group. Only healthy tasks are registered in the target group and receive traffic."
      status={STATUS_TO_CARD_STATUS[data.status]}
      animateIn
    >
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <div className="flex w-[204px] flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-xs font-medium text-fg">{STATUS_LABEL[data.status]}</span>
          <RateReadout value={data.requestsPerMinute} />
        </div>
        <StageProgress status={data.status} stageEnteredAt={data.stageEnteredAt} />
        <span className="truncate font-mono text-[11px] text-fg-muted">{data.log.at(-1)?.message}</span>
        <TaskDebugLog
          log={data.log}
          createdAt={data.createdAt}
          isExpanded={isExpanded}
          onToggle={() => toggleTaskLog(id)}
        />
      </div>
    </NodeCard>
  )
}
