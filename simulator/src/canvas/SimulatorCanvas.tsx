import { useCallback, useMemo } from 'react'
import { Background, BackgroundVariant, Controls, ReactFlow, useNodesState, useEdgesState } from '@xyflow/react'
import { AlbNode } from '../nodes/infra/AlbNode'
import { WafNode } from '../nodes/infra/WafNode'
import { EcsServiceNode } from '../nodes/infra/EcsServiceNode'
import { TargetGroupNode } from '../nodes/infra/TargetGroupNode'
import { TaskNode } from '../nodes/infra/TaskNode'
import { RdsClusterNode } from '../nodes/infra/RdsClusterNode'
import { RdsInstanceNode } from '../nodes/infra/RdsInstanceNode'
import { UserNode } from '../nodes/interaction/UserNode'
import { RequestFlowEdge } from '../edges/RequestFlowEdge'
import { ReplicationEdge } from '../edges/ReplicationEdge'
import { AssociationEdge } from '../edges/AssociationEdge'
import { ApplyConsole } from '../panels/ApplyConsole'
import { ComponentsPanel } from '../panels/ComponentsPanel'
import { SpeedPanel } from '../panels/SpeedPanel'
import { Toolbar } from '../panels/Toolbar'
import { PacketLayer } from './PacketLayer'
import { useSimulationClock } from '../hooks/useSimulationClock'
import { useTrafficRouting } from '../hooks/useTrafficRouting'
import { useTaskGraph } from '../hooks/useTaskGraph'
import { useRenderGraph } from '../hooks/useRenderGraph'
import { useCanvasConnections } from '../hooks/useCanvasConnections'
import { useActiveTool } from '../hooks/useActiveTool'
import { useNodePalette } from '../hooks/useNodePalette'
import { useToolShortcuts } from '../hooks/useToolShortcuts'
import { useSettleViewport } from '../hooks/useSettleViewport'
import { useSimulationStore } from '../store/useSimulationStore'
import { isCreated } from '../simulation/boot-graph'
import {
  ALB_NODE_ID,
  FIT_VIEW_OPTIONS,
  RDS_CLUSTER_TO_READER_EDGE_ID,
  RDS_CLUSTER_TO_WRITER_EDGE_ID,
  initialEdges,
  initialNodes,
} from './initial-graph'

const nodeTypes = {
  alb: AlbNode,
  waf: WafNode,
  ecsService: EcsServiceNode,
  targetGroup: TargetGroupNode,
  task: TaskNode,
  rdsCluster: RdsClusterNode,
  rdsInstance: RdsInstanceNode,
  user: UserNode,
}

const edgeTypes = {
  requestFlow: RequestFlowEdge,
  replication: ReplicationEdge,
  association: AssociationEdge,
}

export function SimulatorCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const tasks = useSimulationStore((state) => state.tasks)
  const resources = useSimulationStore((state) => state.resources)

  useSimulationClock()
  useToolShortcuts()
  const activeTool = useActiveTool()

  const routing = useTrafficRouting({ nodes, edges, tasks })

  const taskGraph = useTaskGraph({
    tasks,
    requestsByTaskId: routing.requestsByTaskId,
    isTargetGroupVisible: isCreated(resources, 'targetGroup'),
    isServiceVisible: isCreated(resources, 'ecsService'),
    isRdsClusterVisible: isCreated(resources, 'rdsCluster'),
  })

  const { renderNodes, renderEdges, liveEdgeIds, hasNoHealthyTargets, rdsReads, rdsWrites } = useRenderGraph({
    nodes,
    edges,
    taskCount: tasks.length,
    routing,
    taskGraph,
  })

  useSettleViewport(renderNodes.length)

  const { isValidConnection, onConnect } = useCanvasConnections({ nodes, edges, setEdges })
  const { onDragOver, onDrop } = useNodePalette({ nodes, onNodesChange })

  const userEdges = useMemo(() => edges.filter((edge) => edge.target === ALB_NODE_ID), [edges])

  const isRejectedAtAlb = useCallback(
    (sourceId: string) => hasNoHealthyTargets || routing.blockedUserIds.has(sourceId),
    [hasNoHealthyTargets, routing.blockedUserIds],
  )

  const packetEntries = useMemo(
    () =>
      userEdges
        .filter((edge) => !isRejectedAtAlb(edge.source))
        .map((edge) => ({ edgeId: edge.id, requestsPerMinute: routing.requestsByUserId.get(edge.source) ?? 0 })),
    [userEdges, routing.requestsByUserId, isRejectedAtAlb],
  )

  const directPacketEntries = useMemo(
    () => [
      { edgeId: RDS_CLUSTER_TO_WRITER_EDGE_ID, requestsPerMinute: rdsWrites, color: 'write' as const },
      { edgeId: RDS_CLUSTER_TO_READER_EDGE_ID, requestsPerMinute: rdsReads, color: 'default' as const },
      ...userEdges
        .filter((edge) => isRejectedAtAlb(edge.source))
        .map((edge) => ({
          edgeId: edge.id,
          requestsPerMinute: routing.requestsByUserId.get(edge.source) ?? 0,
          color: 'blocked' as const,
        })),
    ],
    [rdsWrites, rdsReads, userEdges, routing.requestsByUserId, isRejectedAtAlb],
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
        <PacketLayer
          entries={packetEntries}
          taskEdgeIds={taskGraph.healthyTaskEdgeIds}
          directEntries={directPacketEntries}
          liveEdgeIds={liveEdgeIds}
        />
      </ReactFlow>
      <div className="absolute top-4 left-4 z-10 flex w-[196px] flex-col gap-3">
        <ComponentsPanel />
        <SpeedPanel />
      </div>
      <ApplyConsole />
      <Toolbar />
    </div>
  )
}
