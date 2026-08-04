import { useMemo } from 'react'
import { Background, BackgroundVariant, Controls, ReactFlow, useNodesState, useEdgesState } from '@xyflow/react'
import { AlbNode } from '../nodes/infra/AlbNode'
import { EcsServiceNode } from '../nodes/infra/EcsServiceNode'
import { TaskNode } from '../nodes/infra/TaskNode'
import { UserNode } from '../nodes/interaction/UserNode'
import { RequestFlowEdge } from '../edges/RequestFlowEdge'
import { ComponentsPanel } from '../panels/ComponentsPanel'
import { SpeedPanel } from '../panels/SpeedPanel'
import { Toolbar } from '../panels/Toolbar'
import { PacketLayer } from './PacketLayer'
import { useSimulationClock } from '../hooks/useSimulationClock'
import { useTrafficRouting } from '../hooks/useTrafficRouting'
import { useTaskGraph } from '../hooks/useTaskGraph'
import { useCanvasConnections } from '../hooks/useCanvasConnections'
import { useActiveTool } from '../hooks/useActiveTool'
import { useNodePalette } from '../hooks/useNodePalette'
import { useToolShortcuts } from '../hooks/useToolShortcuts'
import { useSettleViewport } from '../hooks/useSettleViewport'
import { useSimulationStore } from '../store/useSimulationStore'
import { ALB_NODE_ID, ALB_TO_ECS_EDGE_ID, FIT_VIEW_OPTIONS, initialEdges, initialNodes } from './initial-graph'
import type { AlbNodeData, EcsServiceNodeData, SimulatorFlowNode } from '../types/node-data'

const nodeTypes = {
  alb: AlbNode,
  ecsService: EcsServiceNode,
  task: TaskNode,
  user: UserNode,
}

const edgeTypes = {
  requestFlow: RequestFlowEdge,
}

export function SimulatorCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const tasks = useSimulationStore((state) => state.tasks)

  useSimulationClock()
  useToolShortcuts()
  const activeTool = useActiveTool()
  useSettleViewport(tasks.length)

  const { requestsByUserId, requestsByTaskId, totalRequestsAtAlb, healthyTaskCount } = useTrafficRouting({ nodes, edges, tasks })
  const { taskNodes, taskEdges, healthyTaskEdgeIds } = useTaskGraph({ tasks, requestsByTaskId })
  const { isValidConnection, onConnect } = useCanvasConnections({ nodes, edges, setEdges })
  const { onDragOver, onDrop } = useNodePalette({ onNodesChange })

  const renderNodes = useMemo(
    () => [
      ...nodes.map((node): SimulatorFlowNode => {
        if (node.type === 'alb') {
          const data: AlbNodeData = {
            ...node.data,
            requestsPerMinute: totalRequestsAtAlb,
            healthyTargetCount: healthyTaskCount,
            status: healthyTaskCount === 0 && totalRequestsAtAlb > 0 ? 'error' : 'idle',
          }
          return { ...node, data }
        }

        if (node.type === 'ecsService') {
          const data: EcsServiceNodeData = {
            ...node.data,
            requestsPerMinute: totalRequestsAtAlb,
            healthyTaskCount,
            totalTaskCount: tasks.length,
          }
          return { ...node, data }
        }

        return node
      }),
      ...taskNodes,
    ],
    [nodes, totalRequestsAtAlb, healthyTaskCount, tasks.length, taskNodes],
  )

  const packetEntries = useMemo(
    () =>
      edges
        .filter((edge) => edge.target === ALB_NODE_ID)
        .map((edge) => ({ edgeId: edge.id, requestsPerMinute: requestsByUserId.get(edge.source) ?? 0 })),
    [edges, requestsByUserId],
  )

  const renderEdges = useMemo(
    () => [
      ...edges.map((edge) => {
        if (edge.id === ALB_TO_ECS_EDGE_ID) return { ...edge, data: { requestsPerMinute: totalRequestsAtAlb } }
        if (edge.target === ALB_NODE_ID) return { ...edge, data: { requestsPerMinute: requestsByUserId.get(edge.source) ?? 0 } }
        return edge
      }),
      ...taskEdges,
    ],
    [edges, requestsByUserId, totalRequestsAtAlb, taskEdges],
  )

  return (
    <div className="relative h-screen w-screen" data-active-tool={activeTool.id}>
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
        panOnDrag={activeTool.panOnDrag}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2a3a6b" />
        <Controls />
        <PacketLayer entries={packetEntries} taskEdgeIds={healthyTaskEdgeIds} />
      </ReactFlow>
      <div className="absolute top-4 left-4 z-10 flex w-[196px] flex-col gap-3">
        <ComponentsPanel />
        <SpeedPanel />
      </div>
      <Toolbar />
    </div>
  )
}
