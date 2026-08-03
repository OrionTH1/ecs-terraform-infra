import { useCallback, useEffect, useMemo, type DragEvent } from 'react'
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
import { TaskNode } from '../nodes/infra/TaskNode'
import { UserNode } from '../nodes/interaction/UserNode'
import { RequestFlowEdge } from '../edges/RequestFlowEdge'
import { ComponentsPanel } from '../panels/ComponentsPanel'
import { useSimulationStore } from '../store/useSimulationStore'
import type { EcsServiceFlowNode, SimulatorFlowNode, UserFlowNode } from '../types/node-data'
import type { RequestFlowEdge as RequestFlowEdgeType } from '../types/edge-data'
import type { TaskFlowNode } from '../types/task-data'

const nodeTypes = {
  alb: AlbNode,
  ecsService: EcsServiceNode,
  task: TaskNode,
  user: UserNode,
}

const TASK_NODE_ORIGIN = { x: 640, y: 340 }
const TASK_NODE_ROW_HEIGHT = 96

const edgeTypes = {
  requestFlow: RequestFlowEdge,
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
    data: {
      label: 'ECS Service',
      tooltip: 'Runs the application tasks behind the load balancer.',
      status: 'idle',
      requestsPerSecond: 0,
      healthyTaskCount: 2,
      totalTaskCount: 2,
    },
  },
]

const initialEdges: RequestFlowEdgeType[] = [
  {
    id: 'alb-ecs-service',
    type: 'requestFlow',
    source: 'alb',
    sourceHandle: 'out',
    target: 'ecs-service',
    targetHandle: 'in',
    data: { rps: 0 },
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

  const tasks = useSimulationStore((state) => state.tasks)
  const setCurrentRps = useSimulationStore((state) => state.setCurrentRps)
  const startClock = useSimulationStore((state) => state.startClock)

  useEffect(() => {
    startClock()
  }, [startClock])

  const rpsByUserId = useMemo(
    () =>
      new Map(
        nodes.filter((node): node is UserFlowNode => node.type === 'user').map((node) => [node.id, node.data.requestsPerSecond]),
      ),
    [nodes],
  )

  const totalRpsAtAlb = useMemo(
    () => edges.filter((edge) => edge.target === 'alb').reduce((sum, edge) => sum + (rpsByUserId.get(edge.source) ?? 0), 0),
    [edges, rpsByUserId],
  )

  useEffect(() => {
    setCurrentRps(totalRpsAtAlb)
  }, [totalRpsAtAlb, setCurrentRps])

  const healthyTaskCount = useMemo(() => tasks.filter((task) => task.status === 'healthy').length, [tasks])

  const taskNodes = useMemo(
    (): TaskFlowNode[] =>
      tasks.map((task, index) => ({
        id: task.id,
        type: 'task',
        position: { x: TASK_NODE_ORIGIN.x, y: TASK_NODE_ORIGIN.y + index * TASK_NODE_ROW_HEIGHT },
        data: { taskNumber: task.taskNumber, status: task.status, log: task.log },
        draggable: false,
      })),
    [tasks],
  )

  const renderNodes = useMemo(
    () => [
      ...nodes.map((node): SimulatorFlowNode =>
        node.type === 'ecsService'
          ? ({
              ...node,
              data: { ...node.data, requestsPerSecond: totalRpsAtAlb, healthyTaskCount, totalTaskCount: tasks.length },
            } as EcsServiceFlowNode)
          : node,
      ),
      ...taskNodes,
    ],
    [nodes, totalRpsAtAlb, healthyTaskCount, tasks.length, taskNodes],
  )

  const renderEdges = useMemo(
    () =>
      edges.map((edge) => {
        if (edge.id === 'alb-ecs-service') return { ...edge, data: { rps: totalRpsAtAlb } }
        if (edge.target === 'alb') return { ...edge, data: { rps: rpsByUserId.get(edge.source) ?? 0 } }
        return edge
      }),
    [edges, rpsByUserId, totalRpsAtAlb],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source)
      const rps = sourceNode?.type === 'user' ? sourceNode.data.requestsPerSecond : 0
      setEdges((current) => addEdge({ ...connection, type: 'requestFlow', data: { rps } }, current))
    },
    [nodes, setEdges],
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
        nodes={renderNodes}
        edges={renderEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
