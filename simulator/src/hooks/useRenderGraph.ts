import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  EDGE_RESOURCE_ID,
  NODE_RESOURCE_ID,
  WAF_TO_ALB_EDGE_ID,
} from '../canvas/initial-graph'
import { BOOT_GRAPH, type ResourceLedger } from '../simulation/boot-graph'
import { RDS_READ_FRACTION } from '../simulation/simulation-config'
import { splitReadWrite } from '../simulation/traffic-distribution'
import { useSimulationStore } from '../store/useSimulationStore'
import type { TaskGraph } from './useTaskGraph'
import type { TrafficRouting } from './useTrafficRouting'
import type {
  AssociationEdge as AssociationEdgeType,
  RequestFlowEdge as RequestFlowEdgeType,
  ReplicationEdge as ReplicationEdgeType,
  SimulatorFlowEdge,
} from '../types/edge-data'
import type {
  AlbNodeData,
  EcsServiceNodeData,
  ProvisioningInfo,
  RdsClusterNodeData,
  RdsInstanceNodeData,
  SimulatorFlowNode,
  UserGroupNodeData,
  UserNodeData,
  WafNodeData,
} from '../types/node-data'

interface RenderGraphArgs {
  nodes: SimulatorFlowNode[]
  edges: SimulatorFlowEdge[]
  taskCount: number
  routing: TrafficRouting
  taskGraph: TaskGraph
}

export interface RenderGraph {
  renderNodes: SimulatorFlowNode[]
  renderEdges: SimulatorFlowEdge[]
  liveEdgeIds: Set<string>
  deliveredRequests: number
  hasNoHealthyTargets: boolean
  rdsReads: number
  rdsWrites: number
}

function isNodeCreated(ledger: ResourceLedger, nodeId: string): boolean {
  const resourceId = NODE_RESOURCE_ID[nodeId]
  return resourceId === undefined || ledger[resourceId].status === 'created'
}

function isNodeVisible(ledger: ResourceLedger, nodeId: string): boolean {
  const resourceId = NODE_RESOURCE_ID[nodeId]
  return resourceId === undefined || ledger[resourceId].status !== 'pending'
}

function provisioningInfo(ledger: ResourceLedger, nodeId: string): ProvisioningInfo | null {
  const resourceId = NODE_RESOURCE_ID[nodeId]
  if (resourceId === undefined) return null

  const resource = ledger[resourceId]
  if (resource.status !== 'creating') return null

  return {
    terraformAddress: BOOT_GRAPH[resourceId].terraformAddress,
    startedAt: resource.startedAt ?? 0,
    durationMs: BOOT_GRAPH[resourceId].durationMs,
  }
}

function isEdgeVisible(ledger: ResourceLedger, edge: SimulatorFlowEdge): boolean {
  const resourceId = EDGE_RESOURCE_ID[edge.id]
  if (resourceId !== undefined) return ledger[resourceId].status === 'created'

  return isNodeCreated(ledger, edge.source) && isNodeCreated(ledger, edge.target)
}

export function useRenderGraph({ nodes, edges, taskCount, routing, taskGraph }: RenderGraphArgs): RenderGraph {
  const resources = useSimulationStore((state) => state.resources)
  const wafBlockedRequests = useSimulationStore((state) => state.wafBlockedRequests)
  const blockedIps = useSimulationStore((state) => state.blockedIps)

  const hasNoHealthyTargets = routing.healthyTaskCount === 0
  const deliveredRequests = hasNoHealthyTargets ? 0 : routing.totalRequestsAtAlb

  const { reads: rdsReads, writes: rdsWrites } = useMemo(
    () => splitReadWrite(deliveredRequests, RDS_READ_FRACTION),
    [deliveredRequests],
  )

  const renderNodes = useMemo(() => {
    const projected = nodes
      .filter((node) => isNodeVisible(resources, node.id))
      .map((node): SimulatorFlowNode => {
        const provisioning = provisioningInfo(resources, node.id)

        if (node.type === 'alb') {
          const data: AlbNodeData = {
            ...node.data,
            provisioning,
            requestsPerMinute: routing.totalRequestsAtAlb,
            healthyTargetCount: routing.healthyTaskCount,
            status: hasNoHealthyTargets && routing.totalRequestsAtAlb > 0 ? 'error' : 'idle',
          }
          return { ...node, data }
        }

        if (node.type === 'waf') {
          const data: WafNodeData = {
            ...node.data,
            provisioning,
            inspectedRequestsPerMinute: routing.totalRequestsSent,
            blockedRequests: wafBlockedRequests,
            blockedIps,
            status: blockedIps.length > 0 ? 'warning' : 'idle',
          }
          return { ...node, data }
        }

        if (node.type === 'user') {
          const data: UserNodeData = { ...node.data, isRateLimited: routing.blockedUserIds.has(node.id) }
          return { ...node, data }
        }

        if (node.type === 'userGroup') {
          const data: UserGroupNodeData = {
            ...node.data,
            rateLimitedIpCount: routing.blockedIpCountByUserId.get(node.id) ?? 0,
          }
          return { ...node, data }
        }

        if (node.type === 'ecsService') {
          const data: EcsServiceNodeData = {
            ...node.data,
            provisioning,
            requestsPerMinute: deliveredRequests,
            healthyTaskCount: routing.healthyTaskCount,
            totalTaskCount: taskCount,
          }
          return { ...node, position: taskGraph.servicePosition, data }
        }

        if (node.type === 'rdsCluster') {
          const data: RdsClusterNodeData = { ...node.data, provisioning }
          return { ...node, data }
        }

        if (node.type === 'rdsInstance') {
          const isWriter = node.data.role === 'writer'
          const data: RdsInstanceNodeData = {
            ...node.data,
            provisioning,
            requestsPerMinute: isWriter ? rdsWrites : rdsReads,
          }
          return { ...node, data }
        }

        return node
      })

    return taskGraph.targetGroupNode
      ? [taskGraph.targetGroupNode, ...projected, ...taskGraph.taskNodes]
      : [...projected, ...taskGraph.taskNodes]
  }, [
    nodes,
    resources,
    routing,
    hasNoHealthyTargets,
    deliveredRequests,
    taskCount,
    taskGraph,
    rdsWrites,
    rdsReads,
    wafBlockedRequests,
    blockedIps,
  ])

  const renderEdges = useMemo(() => {
    const projected = edges
      .filter((edge) => isEdgeVisible(resources, edge))
      .map((edge): SimulatorFlowEdge => {
        if (edge.id === WAF_TO_ALB_EDGE_ID) {
          return {
            ...edge,
            data: { isActive: blockedIps.length > 0, variant: 'association', routing: 'direct' },
          } as AssociationEdgeType
        }
        if (edge.type === 'replication') return { ...edge, data: { isActive: rdsWrites > 0 } } as ReplicationEdgeType
        if (edge.target === ALB_NODE_ID) {
          return {
            ...edge,
            data: { requestsPerMinute: routing.requestsByUserId.get(edge.source) ?? 0 },
          } as RequestFlowEdgeType
        }
        return edge
      })

    return [...projected, ...taskGraph.taskEdges]
  }, [edges, resources, routing, rdsWrites, taskGraph, blockedIps])

  const liveEdgeIds = useMemo(() => new Set(renderEdges.map((edge) => edge.id)), [renderEdges])

  return { renderNodes, renderEdges, liveEdgeIds, deliveredRequests, hasNoHealthyTargets, rdsReads, rdsWrites }
}
