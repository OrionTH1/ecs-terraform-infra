import { useCallback, useMemo } from 'react'
import { Background, BackgroundVariant, Controls, ReactFlow, useNodesState, useEdgesState } from '@xyflow/react'
import { AlbNode } from '../nodes/infra/AlbNode'
import { WafNode } from '../nodes/infra/WafNode'
import { EcsServiceNode } from '../nodes/infra/EcsServiceNode'
import { TaskNode } from '../nodes/infra/TaskNode'
import { RdsClusterNode } from '../nodes/infra/RdsClusterNode'
import { RdsInstanceNode } from '../nodes/infra/RdsInstanceNode'
import { UserNode } from '../nodes/interaction/UserNode'
import { RequestFlowEdge } from '../edges/RequestFlowEdge'
import { ReplicationEdge } from '../edges/ReplicationEdge'
import { AssociationEdge } from '../edges/AssociationEdge'
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
import { RDS_READ_FRACTION } from '../simulation/simulation-config'
import { splitReadWrite } from '../simulation/traffic-distribution'
import {
  ALB_NODE_ID,
  ALB_TO_ECS_EDGE_ID,
  FIT_VIEW_OPTIONS,
  RDS_CLUSTER_TO_READER_EDGE_ID,
  RDS_CLUSTER_TO_WRITER_EDGE_ID,
  WAF_TO_ALB_EDGE_ID,
  initialEdges,
  initialNodes,
} from './initial-graph'
import type {
  AlbNodeData,
  EcsServiceNodeData,
  RdsClusterNodeData,
  RdsInstanceNodeData,
  SimulatorFlowNode,
  UserNodeData,
  WafNodeData,
} from '../types/node-data'
import type {
  AssociationEdge as AssociationEdgeType,
  RequestFlowEdge as RequestFlowEdgeType,
  ReplicationEdge as ReplicationEdgeType,
  SimulatorFlowEdge,
} from '../types/edge-data'

const nodeTypes = {
  alb: AlbNode,
  waf: WafNode,
  ecsService: EcsServiceNode,
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
  const wafBlockedRequests = useSimulationStore((state) => state.wafBlockedRequests)
  const blockedIps = useSimulationStore((state) => state.blockedIps)

  useSimulationClock()
  useToolShortcuts()
  const activeTool = useActiveTool()
  useSettleViewport(tasks.length)

  const { requestsByUserId, requestsByTaskId, blockedUserIds, totalRequestsSent, totalRequestsAtAlb, healthyTaskCount } =
    useTrafficRouting({ nodes, edges, tasks })
  const { taskNodes, taskEdges, rdsEdges, healthyTaskEdgeIds } = useTaskGraph({ tasks, requestsByTaskId })
  const { isValidConnection, onConnect } = useCanvasConnections({ nodes, edges, setEdges })
  const { onDragOver, onDrop } = useNodePalette({ nodes, onNodesChange })

  const hasNoHealthyTargets = healthyTaskCount === 0
  const deliveredRequests = hasNoHealthyTargets ? 0 : totalRequestsAtAlb

  const { reads: rdsReads, writes: rdsWrites } = useMemo(
    () => splitReadWrite(deliveredRequests, RDS_READ_FRACTION),
    [deliveredRequests],
  )

  const renderNodes = useMemo(
    () => [
      ...nodes.map((node): SimulatorFlowNode => {
        if (node.type === 'alb') {
          const data: AlbNodeData = {
            ...node.data,
            requestsPerMinute: totalRequestsAtAlb,
            healthyTargetCount: healthyTaskCount,
            status: hasNoHealthyTargets && totalRequestsAtAlb > 0 ? 'error' : 'idle',
          }
          return { ...node, data }
        }

        if (node.type === 'waf') {
          const data: WafNodeData = {
            ...node.data,
            inspectedRequestsPerMinute: totalRequestsSent,
            blockedRequests: wafBlockedRequests,
            blockedIps,
            status: blockedIps.length > 0 ? 'warning' : 'idle',
          }
          return { ...node, data }
        }

        if (node.type === 'user') {
          const data: UserNodeData = { ...node.data, isRateLimited: blockedUserIds.has(node.id) }
          return { ...node, data }
        }

        if (node.type === 'ecsService') {
          const data: EcsServiceNodeData = {
            ...node.data,
            requestsPerMinute: deliveredRequests,
            healthyTaskCount,
            totalTaskCount: tasks.length,
          }
          return { ...node, data }
        }

        if (node.type === 'rdsCluster') {
          const data: RdsClusterNodeData = { ...node.data, requestsPerMinute: deliveredRequests }
          return { ...node, data }
        }

        if (node.type === 'rdsInstance') {
          const data: RdsInstanceNodeData = {
            ...node.data,
            requestsPerMinute: node.data.role === 'writer' ? rdsWrites : rdsReads,
          }
          return { ...node, data }
        }

        return node
      }),
      ...taskNodes,
    ],
    [
      nodes,
      totalRequestsSent,
      totalRequestsAtAlb,
      deliveredRequests,
      hasNoHealthyTargets,
      healthyTaskCount,
      tasks.length,
      taskNodes,
      rdsWrites,
      rdsReads,
      wafBlockedRequests,
      blockedIps,
      blockedUserIds,
    ],
  )

  const userEdges = useMemo(() => edges.filter((edge) => edge.target === ALB_NODE_ID), [edges])

  const isRejectedAtAlb = useCallback(
    (sourceId: string) => hasNoHealthyTargets || blockedUserIds.has(sourceId),
    [hasNoHealthyTargets, blockedUserIds],
  )

  const packetEntries = useMemo(
    () =>
      userEdges
        .filter((edge) => !isRejectedAtAlb(edge.source))
        .map((edge) => ({ edgeId: edge.id, requestsPerMinute: requestsByUserId.get(edge.source) ?? 0 })),
    [userEdges, requestsByUserId, isRejectedAtAlb],
  )

  const directPacketEntries = useMemo(
    () => [
      { edgeId: RDS_CLUSTER_TO_WRITER_EDGE_ID, requestsPerMinute: rdsWrites, color: 'write' as const },
      { edgeId: RDS_CLUSTER_TO_READER_EDGE_ID, requestsPerMinute: rdsReads, color: 'default' as const },
      ...userEdges
        .filter((edge) => isRejectedAtAlb(edge.source))
        .map((edge) => ({
          edgeId: edge.id,
          requestsPerMinute: requestsByUserId.get(edge.source) ?? 0,
          color: 'blocked' as const,
        })),
    ],
    [rdsWrites, rdsReads, userEdges, requestsByUserId, isRejectedAtAlb],
  )

  const renderEdges = useMemo(
    () => [
      ...edges.map((edge): SimulatorFlowEdge => {
        if (edge.id === WAF_TO_ALB_EDGE_ID) return { ...edge, data: { isActive: blockedIps.length > 0 } } as AssociationEdgeType
        if (edge.type === 'replication') return { ...edge, data: { isActive: rdsWrites > 0 } } as ReplicationEdgeType
        if (edge.id === ALB_TO_ECS_EDGE_ID) return { ...edge, data: { requestsPerMinute: deliveredRequests } } as RequestFlowEdgeType
        if (edge.id === RDS_CLUSTER_TO_WRITER_EDGE_ID)
          return { ...edge, data: { requestsPerMinute: rdsWrites } } as RequestFlowEdgeType
        if (edge.id === RDS_CLUSTER_TO_READER_EDGE_ID)
          return { ...edge, data: { requestsPerMinute: rdsReads } } as RequestFlowEdgeType
        if (edge.target === ALB_NODE_ID)
          return { ...edge, data: { requestsPerMinute: requestsByUserId.get(edge.source) ?? 0 } } as RequestFlowEdgeType
        return edge
      }),
      ...taskEdges,
      ...rdsEdges,
    ],
    [edges, requestsByUserId, deliveredRequests, rdsWrites, rdsReads, taskEdges, rdsEdges, blockedIps],
  )

  const liveEdgeIds = useMemo(() => new Set(renderEdges.map((edge) => edge.id)), [renderEdges])

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
          taskEdgeIds={healthyTaskEdgeIds}
          directEntries={directPacketEntries}
          liveEdgeIds={liveEdgeIds}
        />
      </ReactFlow>
      <div className="absolute top-4 left-4 z-10 flex w-[196px] flex-col gap-3">
        <ComponentsPanel />
        <SpeedPanel />
      </div>
      <Toolbar />
    </div>
  )
}
