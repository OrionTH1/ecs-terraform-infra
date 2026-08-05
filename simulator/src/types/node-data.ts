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
  sourceIp: string
  isRateLimited: boolean
}

export interface WafNodeData extends InfraNodeData {
  inspectedRequestsPerMinute: number
  blockedRequests: number
  blockedIps: string[]
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

export interface RdsClusterNodeData extends InfraNodeData {
  requestsPerMinute: number
}

export type RdsInstanceRole = 'writer' | 'reader'

export interface RdsInstanceNodeData extends InfraNodeData {
  role: RdsInstanceRole
  requestsPerMinute: number
}

export type AlbFlowNode = Node<AlbNodeData, 'alb'>
export type EcsServiceFlowNode = Node<EcsServiceNodeData, 'ecsService'>
export type UserFlowNode = Node<UserNodeData, 'user'>
export type WafFlowNode = Node<WafNodeData, 'waf'>
export type RdsClusterFlowNode = Node<RdsClusterNodeData, 'rdsCluster'>
export type RdsInstanceFlowNode = Node<RdsInstanceNodeData, 'rdsInstance'>

export type SimulatorFlowNode =
  | AlbFlowNode
  | EcsServiceFlowNode
  | UserFlowNode
  | WafFlowNode
  | TaskFlowNode
  | RdsClusterFlowNode
  | RdsInstanceFlowNode
