import { useCallback } from 'react'
import { addEdge, type Connection, type IsValidConnection, type OnConnectEnd } from '@xyflow/react'
import { ALB_NODE_ID } from '../canvas/initial-graph'
import { canReachLoadBalancer, toTrafficSource } from '../simulation/traffic-source'
import type { SimulatorFlowEdge } from '../types/edge-data'
import type { SimulatorFlowNode } from '../types/node-data'

interface CanvasConnectionsArgs {
  nodes: SimulatorFlowNode[]
  edges: SimulatorFlowEdge[]
  setEdges: (updater: (edges: SimulatorFlowEdge[]) => SimulatorFlowEdge[]) => void
}

export function useCanvasConnections({ nodes, edges, setEdges }: CanvasConnectionsArgs) {
  const acceptsTrafficFrom = useCallback(
    (sourceId: string | null | undefined) => canReachLoadBalancer(nodes, edges, sourceId, ALB_NODE_ID),
    [nodes, edges],
  )

  const isValidConnection = useCallback<IsValidConnection<SimulatorFlowEdge>>(
    (connection) => {
      if (connection.target !== ALB_NODE_ID || connection.targetHandle !== 'in') return false

      return acceptsTrafficFrom(connection.source)
    },
    [acceptsTrafficFrom],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source)
      const trafficSource = source === undefined ? null : toTrafficSource(source)
      const requestsPerMinute = trafficSource
        ? trafficSource.requestsPerMinute * trafficSource.sourceIps.length
        : 0
      setEdges((current) => addEdge({ ...connection, type: 'requestFlow', data: { requestsPerMinute } }, current))
    },
    [nodes, setEdges],
  )

  const onConnectEnd = useCallback<OnConnectEnd>(
    (_event, connectionState) => {
      if (!connectionState.fromNode || connectionState.toHandle) return

      const droppedOn = connectionState.toNode
      if (droppedOn === null) return

      const startedAtAlb = connectionState.fromNode.id === ALB_NODE_ID
      const sourceId = startedAtAlb ? droppedOn.id : connectionState.fromNode.id
      const landedOnAlb = startedAtAlb ? true : droppedOn.id === ALB_NODE_ID

      if (!landedOnAlb || !acceptsTrafficFrom(sourceId)) return

      onConnect({ source: sourceId, sourceHandle: 'out', target: ALB_NODE_ID, targetHandle: 'in' })
    },
    [acceptsTrafficFrom, onConnect],
  )

  return { isValidConnection, onConnect, onConnectEnd }
}
