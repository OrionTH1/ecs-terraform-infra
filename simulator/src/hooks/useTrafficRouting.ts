import { useEffect, useMemo } from 'react'
import { ALB_NODE_ID } from '../canvas/initial-graph'
import { distributeRoundRobin } from '../simulation/traffic-distribution'
import { useSimulationStore, type SourceRate, type TaskRuntime } from '../store/useSimulationStore'
import type { SimulatorFlowEdge } from '../types/edge-data'
import type { SimulatorFlowNode, UserFlowNode } from '../types/node-data'

interface TrafficRoutingArgs {
  nodes: SimulatorFlowNode[]
  edges: SimulatorFlowEdge[]
  tasks: TaskRuntime[]
}

export interface TrafficRouting {
  requestsByUserId: Map<string, number>
  requestsByTaskId: Map<string, number>
  blockedUserIds: Set<string>
  totalRequestsSent: number
  totalRequestsAtAlb: number
  healthyTaskCount: number
}

export function useTrafficRouting({ nodes, edges, tasks }: TrafficRoutingArgs): TrafficRouting {
  const setSourceRates = useSimulationStore((state) => state.setSourceRates)
  const blockedIps = useSimulationStore((state) => state.blockedIps)

  const userNodes = useMemo(() => nodes.filter((node): node is UserFlowNode => node.type === 'user'), [nodes])

  const requestsByUserId = useMemo(
    () => new Map(userNodes.map((node) => [node.id, node.data.requestsPerMinute])),
    [userNodes],
  )

  const connectedUserIds = useMemo(
    () => new Set(edges.filter((edge) => edge.target === ALB_NODE_ID).map((edge) => edge.source)),
    [edges],
  )

  const sourceRates = useMemo<SourceRate[]>(() => {
    const byIp = new Map<string, number>()

    for (const node of userNodes) {
      const requestsPerMinute = connectedUserIds.has(node.id) ? node.data.requestsPerMinute : 0
      byIp.set(node.data.sourceIp, (byIp.get(node.data.sourceIp) ?? 0) + requestsPerMinute)
    }

    return [...byIp].map(([ip, requestsPerMinute]) => ({ ip, requestsPerMinute }))
  }, [userNodes, connectedUserIds])

  useEffect(() => {
    setSourceRates(sourceRates)
  }, [sourceRates, setSourceRates])

  const blockedIpSet = useMemo(() => new Set(blockedIps), [blockedIps])

  const blockedUserIds = useMemo(
    () => new Set(userNodes.filter((node) => blockedIpSet.has(node.data.sourceIp)).map((node) => node.id)),
    [userNodes, blockedIpSet],
  )

  const totalRequestsSent = useMemo(
    () => sourceRates.reduce((sum, rate) => sum + rate.requestsPerMinute, 0),
    [sourceRates],
  )

  const totalRequestsAtAlb = useMemo(
    () => sourceRates.reduce((sum, rate) => (blockedIpSet.has(rate.ip) ? sum : sum + rate.requestsPerMinute), 0),
    [sourceRates, blockedIpSet],
  )

  const healthyTaskIds = useMemo(() => tasks.filter((task) => task.status === 'healthy').map((task) => task.id), [tasks])

  const requestsByTaskId = useMemo(
    () => distributeRoundRobin(totalRequestsAtAlb, healthyTaskIds),
    [totalRequestsAtAlb, healthyTaskIds],
  )

  return {
    requestsByUserId,
    requestsByTaskId,
    blockedUserIds,
    totalRequestsSent,
    totalRequestsAtAlb,
    healthyTaskCount: healthyTaskIds.length,
  }
}
