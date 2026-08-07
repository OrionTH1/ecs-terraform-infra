import type { Node } from '@xyflow/react'

export type TaskStatus = 'provisioning' | 'starting' | 'registering' | 'healthy' | 'draining' | 'failed'

export interface TaskNodeData extends Record<string, unknown> {
  taskNumber: number
  status: TaskStatus
  stageEnteredAt: number
  createdAt: number
  requestsPerMinute: number
  latencyMs: number
  isLeaving: boolean
}

export type TaskFlowNode = Node<TaskNodeData, 'task'>

export const TASK_STATUS_MESSAGE: Record<TaskStatus, string | null> = {
  provisioning: 'Pulling image from ECR',
  starting: 'Image pulled, starting container',
  registering: 'Registering with target group',
  healthy: null,
  draining: 'Deregistering from target group',
  failed: 'Stopped: essential container exited (137)',
}
