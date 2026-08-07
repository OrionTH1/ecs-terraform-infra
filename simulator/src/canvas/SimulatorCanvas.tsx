import { useCallback, useMemo, useRef } from 'react'
import { Background, BackgroundVariant, Controls, ReactFlow, useNodesState, useEdgesState } from '@xyflow/react'
import { AlbNode } from '../nodes/infra/AlbNode'
import { WafNode } from '../nodes/infra/WafNode'
import { EcsServiceNode } from '../nodes/infra/EcsServiceNode'
import { AutoScalingNode } from '../nodes/infra/AutoScalingNode'
import { TargetGroupNode } from '../nodes/infra/TargetGroupNode'
import { DbJunctionNode } from '../nodes/infra/DbJunctionNode'
import { TaskNode } from '../nodes/infra/TaskNode'
import { NetworkZoneNode } from '../nodes/infra/NetworkZoneNode'
import { VpcEndpointNode } from '../nodes/infra/VpcEndpointNode'
import { RegionalServiceNode } from '../nodes/infra/RegionalServiceNode'
import { AuroraClusterNode } from '../nodes/infra/AuroraClusterNode'
import { ClusterVolumeNode } from '../nodes/infra/ClusterVolumeNode'
import { RdsInstanceNode } from '../nodes/infra/RdsInstanceNode'
import { UserNode } from '../nodes/interaction/UserNode'
import { UserGroupNode } from '../nodes/interaction/UserGroupNode'
import { RequestFlowEdge } from '../edges/RequestFlowEdge'
import { ReplicationEdge } from '../edges/ReplicationEdge'
import { SignalEdge } from '../edges/SignalEdge'
import { ApplyConsole } from '../panels/ApplyConsole'
import { CanvasControls } from '../panels/CanvasControls'
import { PacketLayer } from './PacketLayer'
import { useSimulationClock } from '../hooks/useSimulationClock'
import { useTrafficRouting } from '../hooks/useTrafficRouting'
import { useNetworkZoneLayout } from '../hooks/useNetworkZoneLayout'
import { useTaskGraph } from '../hooks/useTaskGraph'
import { useRenderGraph } from '../hooks/useRenderGraph'
import { useCanvasConnections } from '../hooks/useCanvasConnections'
import { useActiveTool } from '../hooks/useActiveTool'
import { useNodePalette } from '../hooks/useNodePalette'
import { useToolShortcuts } from '../hooks/useToolShortcuts'
import { useSettleViewport } from '../hooks/useSettleViewport'
import { useIsCompactViewport } from '../hooks/useMediaQuery'
import { useSimulationStore } from '../store/useSimulationStore'
import { useSecurityGroupStore } from '../store/useSecurityGroupStore'
import { isAcceptingTraffic } from '../simulation/aurora'
import { isCreated } from '../simulation/boot-graph'
import {
  ALB_NODE_ID,
  CONNECTION_RADIUS,
  FIT_VIEW_OPTIONS,
  MIN_ZOOM,
  initialEdges,
  initialNodes,
} from './initial-graph'

const nodeTypes = {
  alb: AlbNode,
  waf: WafNode,
  ecsService: EcsServiceNode,
  autoScaling: AutoScalingNode,
  targetGroup: TargetGroupNode,
  dbJunction: DbJunctionNode,
  task: TaskNode,
  auroraCluster: AuroraClusterNode,
  networkZone: NetworkZoneNode,
  vpcEndpoint: VpcEndpointNode,
  regionalService: RegionalServiceNode,
  clusterVolume: ClusterVolumeNode,
  rdsInstance: RdsInstanceNode,
  user: UserNode,
  userGroup: UserGroupNode,
}

const edgeTypes = {
  requestFlow: RequestFlowEdge,
  replication: ReplicationEdge,
  signal: SignalEdge,
}

export function SimulatorCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const tasks = useSimulationStore((state) => state.tasks)
  const resources = useSimulationStore((state) => state.resources)
  const rdsSlots = useSimulationStore((state) => state.rdsSlots)
  const taskLatencyMs = useSimulationStore((state) => Math.round(state.displayedLatency.taskMs))

  useSimulationClock()
  useToolShortcuts()
  const activeTool = useActiveTool()

  const routing = useTrafficRouting({ nodes, edges, tasks })

  const taskGraph = useTaskGraph({
    tasks,
    requestsByTaskId: routing.requestsByTaskId,
    isTargetGroupVisible: isCreated(resources, 'targetGroup'),
    isWriterAvailable: isAcceptingTraffic(rdsSlots.writer?.lifecycle),
    isReaderAvailable: isAcceptingTraffic(rdsSlots.reader?.lifecycle),
    taskLatencyMs,
  })

  const networkZones = useNetworkZoneLayout({ serviceFrame: taskGraph.serviceFrame })

  const { renderNodes, renderEdges, liveEdgeIds, hasNoHealthyTargets } = useRenderGraph({
    nodes,
    edges,
    routing,
    taskGraph,
    networkZones,
  })

  useSettleViewport(renderNodes.length)

  const { isValidConnection, onConnect, onConnectEnd } = useCanvasConnections({ nodes, edges, setEdges })
  const { onDragOver, onDrop, addNodeAtViewportCenter } = useNodePalette({ nodes, onNodesChange })
  const isCompact = useIsCompactViewport()
  const shell = useRef<HTMLDivElement>(null)

  const markMoving = useCallback((moving: boolean) => {
    shell.current?.setAttribute('data-moving', String(moving))
  }, [])
  const clearAllBoundaries = useSecurityGroupStore((state) => state.clearAllBoundaries)

  const userEdges = useMemo(() => edges.filter((edge) => edge.target === ALB_NODE_ID), [edges])

  const isRejectedAtAlb = useCallback(
    (sourceId: string) => hasNoHealthyTargets || routing.blockedUserIds.has(sourceId),
    [hasNoHealthyTargets, routing.blockedUserIds],
  )

  const packetEntries = useMemo(
    () =>
      userEdges
        .filter((edge) => !isRejectedAtAlb(edge.source))
        .map((edge) => ({ edgeId: edge.id, requestsPerMinute: routing.deliveredByUserId.get(edge.source) ?? 0 })),
    [userEdges, routing.deliveredByUserId, isRejectedAtAlb],
  )

  const directPacketEntries = useMemo(
    () =>
      userEdges
        .filter((edge) => isRejectedAtAlb(edge.source))
        .map((edge) => ({
          edgeId: edge.id,
          requestsPerMinute: routing.requestsByUserId.get(edge.source) ?? 0,
          color: 'blocked' as const,
        })),
    [userEdges, routing.requestsByUserId, isRejectedAtAlb],
  )

  return (
    <div ref={shell} className="relative h-dvh w-full overflow-hidden" data-active-tool={activeTool.id}>
      <ReactFlow
        nodes={renderNodes}
        edges={renderEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        connectionRadius={CONNECTION_RADIUS}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={clearAllBoundaries}
        onMoveStart={() => markMoving(true)}
        onMoveEnd={() => markMoving(false)}
        panOnDrag={activeTool.panOnDrag}
        minZoom={MIN_ZOOM}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2a3a6b" />
        <Controls position={isCompact ? 'top-left' : 'bottom-left'} showInteractive={false} />
        <PacketLayer
          entries={packetEntries}
          taskRoutes={taskGraph.healthyTaskRoutes}
          imagePullRoutes={taskGraph.imagePullRoutes}
          directEntries={directPacketEntries}
          liveEdgeIds={liveEdgeIds}
        />
      </ReactFlow>
      <ApplyConsole />
      <CanvasControls onAddNode={addNodeAtViewportCenter} />
    </div>
  )
}
