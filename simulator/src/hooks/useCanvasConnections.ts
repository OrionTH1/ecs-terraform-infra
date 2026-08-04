import { useCallback } from 'react'
import { addEdge, type Connection, type IsValidConnection } from '@xyflow/react'
import { ALB_NODE_ID } from '../canvas/initial-graph'
import type { SimulatorFlowEdge } from '../types/edge-data'
import type { SimulatorFlowNode } from '../types/node-data'

interface CanvasConnectionsArgs {
  nodes: SimulatorFlowNode[]
  edges: SimulatorFlowEdge[]
  setEdges: (updater: (edges: SimulatorFlowEdge[]) => SimulatorFlowEdge[]) => void
}

export function useCanvasConnections({ nodes, edges, setEdges }: CanvasConnectionsArgs) {
  const isValidConnection = useCallback<IsValidConnection<SimulatorFlowEdge>>(
    (connection) => {
      if (connection.target !== ALB_NODE_ID || connection.targetHandle !== 'in') return false

      const source = nodes.find((node) => node.id === connection.source)
      if (source?.type !== 'user') return false

      return !edges.some((edge) => edge.source === connection.source && edge.target === ALB_NODE_ID)
    },
    [nodes, edges],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source)
      const requestsPerMinute = source?.type === 'user' ? source.data.requestsPerMinute : 0
      setEdges((current) => addEdge({ ...connection, type: 'requestFlow', data: { requestsPerMinute } }, current))
    },
    [nodes, setEdges],
  )

  return { isValidConnection, onConnect }
}
