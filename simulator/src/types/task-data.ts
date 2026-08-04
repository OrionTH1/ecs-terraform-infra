import type { Node } from '@xyflow/react'

export type TaskStatus = 'provisioning' | 'starting' | 'registering' | 'healthy' | 'draining'

export interface TaskLogEntry {
  message: string
  atMs: number
}

export interface TaskNodeData extends Record<string, unknown> {
  taskNumber: number
  status: TaskStatus
  stageEnteredAt: number
  log: TaskLogEntry[]
  createdAt: number
  requestsPerMinute: number
}

export type TaskFlowNode = Node<TaskNodeData, 'task'>
