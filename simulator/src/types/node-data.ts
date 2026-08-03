import type { Node } from '@xyflow/react'

export type NodeStatus = 'idle' | 'healthy' | 'warning' | 'error'

export interface InfraNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  status: NodeStatus
}

export interface UserNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  requestsPerSecond: number
}

export type AlbFlowNode = Node<InfraNodeData, 'alb'>
export type EcsServiceFlowNode = Node<InfraNodeData, 'ecsService'>
export type UserFlowNode = Node<UserNodeData, 'user'>

export type SimulatorFlowNode = AlbFlowNode | EcsServiceFlowNode | UserFlowNode
