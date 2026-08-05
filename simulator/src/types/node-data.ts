import type { Node } from '@xyflow/react'
import type { TaskFlowNode } from './task-data'

export type NodeStatus = 'idle' | 'healthy' | 'warning' | 'error'

export interface ProvisioningInfo {
  detail: string
  label?: string
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

export interface AuroraClusterNodeData extends InfraNodeData {
  width: number
  height: number
}

export type ClusterVolumeNodeData = InfraNodeData

export type RdsInstanceRole = 'writer' | 'reader'
export type RdsInstanceLifecycle = 'provisioning' | 'promoting' | 'available' | 'failed'

export interface RdsInstanceNodeData extends InfraNodeData {
  role: RdsInstanceRole
  lifecycle: RdsInstanceLifecycle
  requestsPerMinute: number
  isCacheInvalidating: boolean
}

export type AlbFlowNode = Node<AlbNodeData, 'alb'>
export type EcsServiceFlowNode = Node<EcsServiceNodeData, 'ecsService'>
export type UserFlowNode = Node<UserNodeData, 'user'>
export type UserGroupFlowNode = Node<UserGroupNodeData, 'userGroup'>
export type WafFlowNode = Node<WafNodeData, 'waf'>
export type TargetGroupFlowNode = Node<TargetGroupNodeData, 'targetGroup'>
export type DbJunctionFlowNode = Node<Record<string, unknown>, 'dbJunction'>
export type AuroraClusterFlowNode = Node<AuroraClusterNodeData, 'auroraCluster'>
export type ClusterVolumeFlowNode = Node<ClusterVolumeNodeData, 'clusterVolume'>
export type RdsInstanceFlowNode = Node<RdsInstanceNodeData, 'rdsInstance'>

export type SimulatorFlowNode =
  | AlbFlowNode
  | EcsServiceFlowNode
  | UserFlowNode
  | UserGroupFlowNode
  | WafFlowNode
  | TargetGroupFlowNode
  | DbJunctionFlowNode
  | TaskFlowNode
  | AuroraClusterFlowNode
  | ClusterVolumeFlowNode
  | RdsInstanceFlowNode
