import type { Node } from '@xyflow/react'
import type { TaskFlowNode } from './task-data'

export type NodeStatus = 'idle' | 'healthy' | 'warning' | 'error'

export interface InfraNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  status: NodeStatus
}

export type TrafficPattern = 'constant' | 'ramp' | 'burst'

export interface UserNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  pattern: TrafficPattern
  patternStartedAt: number
  peakRequestsPerMinute: number
  rampFromRequestsPerMinute: number
  requestsPerMinute: number
}

export interface AlbNodeData extends InfraNodeData {
  requestsPerMinute: number
  healthyTargetCount: number
}

export interface EcsServiceNodeData extends InfraNodeData {
  requestsPerMinute: number
  healthyTaskCount: number
  totalTaskCount: number
}

export type AlbFlowNode = Node<AlbNodeData, 'alb'>
export type EcsServiceFlowNode = Node<EcsServiceNodeData, 'ecsService'>
export type UserFlowNode = Node<UserNodeData, 'user'>

export type SimulatorFlowNode = AlbFlowNode | EcsServiceFlowNode | UserFlowNode | TaskFlowNode
