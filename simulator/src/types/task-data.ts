import type { Node } from '@xyflow/react'

export type TaskStatus = 'provisioning' | 'starting' | 'registering' | 'healthy' | 'draining'

export interface TaskNodeData extends Record<string, unknown> {
  taskNumber: number
  status: TaskStatus
  log: string[]
}

export type TaskFlowNode = Node<TaskNodeData, 'task'>
