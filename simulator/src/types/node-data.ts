import type { Node } from '@xyflow/react'
import type { TaskFlowNode } from './task-data'

export type NodeStatus = 'idle' | 'healthy' | 'warning' | 'error'

export interface ProvisioningInfo {
  terraformAddress: string
  startedAt: number
  durationMs: number
}

export interface InfraNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  status: NodeStatus
  provisioning?: ProvisioningInfo | null
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

export interface UserGroupNodeData extends Record<string, unknown> {
  label: string
  tooltip: string
  pattern: TrafficPattern
  patternStartedAt: number
  peakRequestsPerMinute: number
  rampFromRequestsPerMinute: number
  requestsPerMinute: number
  userCount: number
  sourceIps: string[]
  rateLimitedIpCount: number
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

export interface TargetGroupNodeData extends InfraNodeData {
  width: number
  height: number
  registeredTargetCount: number
  healthyTargetCount: number
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
export type UserGroupFlowNode = Node<UserGroupNodeData, 'userGroup'>
export type WafFlowNode = Node<WafNodeData, 'waf'>
export type TargetGroupFlowNode = Node<TargetGroupNodeData, 'targetGroup'>
export type RdsClusterFlowNode = Node<RdsClusterNodeData, 'rdsCluster'>
export type RdsInstanceFlowNode = Node<RdsInstanceNodeData, 'rdsInstance'>

export type SimulatorFlowNode =
  | AlbFlowNode
  | EcsServiceFlowNode
  | UserFlowNode
  | UserGroupFlowNode
  | WafFlowNode
  | TargetGroupFlowNode
  | TaskFlowNode
  | RdsClusterFlowNode
  | RdsInstanceFlowNode
