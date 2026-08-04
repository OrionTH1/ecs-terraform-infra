import type { Node } from '@xyflow/react'
import type { TaskFlowNode } from './task-data'

export type NodeStatus = 'idle' | 'healthy' | 'warning' | 'error'

export interface InfraNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  status: NodeStatus
}

export interface UserNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  requestsPerMinute: number
}

export interface EcsServiceNodeData extends InfraNodeData {
  requestsPerMinute: number
  healthyTaskCount: number
  totalTaskCount: number
}

export type AlbFlowNode = Node<InfraNodeData, 'alb'>
export type EcsServiceFlowNode = Node<EcsServiceNodeData, 'ecsService'>
export type UserFlowNode = Node<UserNodeData, 'user'>

export type SimulatorFlowNode = AlbFlowNode | EcsServiceFlowNode | UserFlowNode | TaskFlowNode
