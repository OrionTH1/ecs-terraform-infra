import { Handle, Position, type NodeProps } from '@xyflow/react'
import { STAGE_DURATION_MS } from '../../simulation/simulation-config'
import { TaskBlastEffect } from './TaskBlastEffect'
import { TaskDebugLog } from './TaskDebugLog'
import { useSimulationStore } from '../../store/useSimulationStore'
import { useTaskBlast } from '../../hooks/useTaskBlast'
import type { NodeStatus } from '../../types/node-data'
import type { TaskFlowNode, TaskStatus } from '../../types/task-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { StageProgress, type StageTone } from '../shared/StageProgress'
import { TaskIcon } from '../../icons'

const STATUS_LABEL: Record<TaskStatus, string> = {
  provisioning: 'Provisioning',
  starting: 'Starting',
  registering: 'Registering',
  healthy: 'Healthy',
  draining: 'Draining',
  failed: 'Stopped',
}

const STATUS_TO_CARD_STATUS: Record<TaskStatus, NodeStatus> = {
  provisioning: 'warning',
  starting: 'warning',
  registering: 'warning',
  healthy: 'healthy',
  draining: 'error',
  failed: 'error',
}

const STATUS_TO_STAGE_TONE: Record<TaskStatus, StageTone> = {
  provisioning: 'warning',
  starting: 'warning',
  registering: 'warning',
  healthy: 'warning',
  draining: 'error',
  failed: 'error',
}

export function TaskNode({ id, data }: NodeProps<TaskFlowNode>) {
  const isExpanded = useSimulationStore((state) => state.expandedTaskIds.includes(id))
  const toggleTaskLog = useSimulationStore((state) => state.toggleTaskLog)
  const { isTargetable, blast } = useTaskBlast({ taskId: id, status: data.status })

  return (
    <NodeCard
      variant="infra"
      icon={<TaskIcon />}
      title={`Task ${data.taskNumber}`}
      tooltip="One ECS Fargate task behind the ALB target group. Only healthy tasks are registered in the target group and receive traffic."
      status={STATUS_TO_CARD_STATUS[data.status]}
      isProvisional={data.status === 'registering'}
      isLeaving={data.isLeaving}
      isTargetable={isTargetable}
      isBlasted={data.status === 'failed'}
      overlay={data.status === 'failed' ? <TaskBlastEffect /> : null}
      onTargetClick={blast}
      handles={
        <>
          <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
          <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
        </>
      }
    >
      <div className="flex w-[204px] flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span key={data.status} className="content-resolve font-sans text-xs font-medium text-fg">
            {STATUS_LABEL[data.status]}
          </span>
          <RateReadout value={data.requestsPerMinute} />
        </div>
        <StageProgress
          durationMs={STAGE_DURATION_MS[data.status]}
          startedAt={data.stageEnteredAt}
          tone={STATUS_TO_STAGE_TONE[data.status]}
        />
        <span
          key={data.log.at(-1)?.atMs}
          className="content-resolve truncate font-mono text-[11px] text-fg-muted"
        >
          {data.log.at(-1)?.message}
        </span>
        <TaskDebugLog
          log={data.log}
          createdAt={data.createdAt}
          isExpanded={isExpanded}
          onToggle={() => toggleTaskLog(id)}
          disableToggle={isTargetable}
        />
      </div>
    </NodeCard>
  )
}
