import { useEffect, useMemo } from 'react'
import { ALB_NODE_ID } from '../canvas/initial-graph'
import { distributeRoundRobin } from '../simulation/traffic-distribution'
import { useSimulationStore, type TaskRuntime } from '../store/useSimulationStore'
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
  totalRequestsAtAlb: number
  healthyTaskCount: number
}

export function useTrafficRouting({ nodes, edges, tasks }: TrafficRoutingArgs): TrafficRouting {
  const setCurrentRequestRate = useSimulationStore((state) => state.setCurrentRequestRate)

  const requestsByUserId = useMemo(
    () =>
      new Map(
        nodes.filter((node): node is UserFlowNode => node.type === 'user').map((node) => [node.id, node.data.requestsPerMinute]),
      ),
    [nodes],
  )

  const totalRequestsAtAlb = useMemo(
    () =>
      edges.filter((edge) => edge.target === ALB_NODE_ID).reduce((sum, edge) => sum + (requestsByUserId.get(edge.source) ?? 0), 0),
    [edges, requestsByUserId],
  )

  const healthyTaskIds = useMemo(() => tasks.filter((task) => task.status === 'healthy').map((task) => task.id), [tasks])

  const requestsByTaskId = useMemo(
    () => distributeRoundRobin(totalRequestsAtAlb, healthyTaskIds),
    [totalRequestsAtAlb, healthyTaskIds],
  )

  useEffect(() => {
    setCurrentRequestRate(totalRequestsAtAlb)
  }, [totalRequestsAtAlb, setCurrentRequestRate])

  return { requestsByUserId, requestsByTaskId, totalRequestsAtAlb, healthyTaskCount: healthyTaskIds.length }
}
