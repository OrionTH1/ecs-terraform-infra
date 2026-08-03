import { useCallback, type DragEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type IsValidConnection,
} from '@xyflow/react'
import { AlbNode } from '../nodes/infra/AlbNode'
import { EcsServiceNode } from '../nodes/infra/EcsServiceNode'
import { UserNode } from '../nodes/interaction/UserNode'
import { ComponentsPanel } from '../panels/ComponentsPanel'
import type { SimulatorFlowNode } from '../types/node-data'

const nodeTypes = {
  alb: AlbNode,
  ecsService: EcsServiceNode,
  user: UserNode,
}

const initialNodes: SimulatorFlowNode[] = [
  {
    id: 'alb',
    type: 'alb',
    position: { x: 360, y: 200 },
    data: { label: 'Load Balancer', tooltip: 'Distributes incoming requests across healthy ECS tasks.', status: 'idle' },
  },
  {
    id: 'ecs-service',
    type: 'ecsService',
    position: { x: 640, y: 200 },
    data: { label: 'ECS Service', tooltip: 'Runs the application tasks behind the load balancer.', status: 'idle' },
  },
]

const initialEdges = [
  {
    id: 'alb-ecs-service',
    source: 'alb',
    sourceHandle: 'out',
    target: 'ecs-service',
    targetHandle: 'in',
    deletable: false,
    reconnectable: false,
  },
]

const isValidConnection: IsValidConnection = (connection) =>
  connection.source !== undefined &&
  connection.target === 'alb' &&
  connection.targetHandle === 'in' &&
  connection.sourceHandle === 'out'

let userNodeCount = 0

export function SimulatorCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { screenToFlowPosition } = useReactFlow()

  const onConnect = useCallback(
    (connection: Connection) => setEdges((current) => addEdge(connection, current)),
    [setEdges],
  )

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (nodeType !== 'user') return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      userNodeCount += 1

      const newNode: SimulatorFlowNode = {
        id: `user-${userNodeCount}`,
        type: 'user',
        position,
        data: { label: 'User', tooltip: 'Simulates normal traffic at a fixed requests-per-second rate.', requestsPerSecond: 10 },
      }

      // Node is appended via the change stream so React Flow's internal state stays in sync.
      onNodesChange([{ type: 'add', item: newNode }])
    },
    [screenToFlowPosition, onNodesChange],
  )

  return (
    <div className="relative h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2a3a6b" />
        <Controls />
      </ReactFlow>
      <ComponentsPanel />
    </div>
  )
}
