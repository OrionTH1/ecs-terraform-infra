import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  DB_JUNCTION_NODE_ID,
  JUNCTION_TO_READER_EDGE_ID,
  JUNCTION_TO_WRITER_EDGE_ID,
  READER_TO_VOLUME_EDGE_ID,
  WRITER_TO_VOLUME_EDGE_ID,
  GATEWAY_ENDPOINT_NODE_ID,
  INTERFACE_ENDPOINTS_NODE_ID,
  ENDPOINT_TO_ECR_EDGE_ID,
  ENDPOINT_TO_STORAGE_EDGE_ID,
  albToTaskEdgeId,
  taskToJunctionEdgeId,
  taskToRegistryEdgeId,
  taskToStorageEdgeId,
} from '../canvas/initial-graph'
import { isPullingImageStatus, pullSecondsRemaining, type ImagePullLegs } from '../simulation/image-pull'
import { TASK_LIFECYCLE } from '../simulation/simulation-config'
import { useSimulationStore } from '../store/useSimulationStore'

const IMAGE_PULL_DURATION_MS = TASK_LIFECYCLE.provisioningMs + TASK_LIFECYCLE.startingMs
import { isRegisteredTarget } from '../simulation/target-group'
import { useLeavingTasks } from './useLeavingTasks'
import { useTaskColumnLayout } from './useTaskColumnLayout'
import type { TaskRuntime } from '../store/useSimulationStore'
import type { RequestFlowEdge } from '../types/edge-data'
import type { FrameBox } from '../canvas/frame-metrics'
import type { TargetGroupFlowNode } from '../types/node-data'
import type { TaskFlowNode } from '../types/task-data'

interface TaskGraphArgs {
  tasks: TaskRuntime[]
  requestsByTaskId: Map<string, number>
  isTargetGroupVisible: boolean
  isWriterAvailable: boolean
  isReaderAvailable: boolean
  taskLatencyMs: number
}

export interface DatabaseLeg {
  instanceEdgeId: string
  volumeEdgeId: string
}

export interface TaskRoute {
  albEdgeId: string
  junctionEdgeId: string | null
  readLeg: DatabaseLeg | null
  writeLeg: DatabaseLeg | null
}

export interface TaskGraph {
  taskNodes: TaskFlowNode[]
  targetGroupNode: TargetGroupFlowNode | null
  serviceFrame: FrameBox
  taskEdges: RequestFlowEdge[]
  healthyTaskRoutes: TaskRoute[]
  imagePullRoutes: ImagePullLegs[]
}

export function useTaskGraph({
  tasks,
  requestsByTaskId,
  isTargetGroupVisible,
  isWriterAvailable,
  isReaderAvailable,
  taskLatencyMs,
}: TaskGraphArgs): TaskGraph {
  const leavingTasks = useLeavingTasks(tasks)
  const clock = useSimulationStore((state) => state.clock)
  const timeScale = useSimulationStore((state) => state.timeScale)

  const orderedTasks = useMemo(
    () => [...tasks, ...leavingTasks].sort((a, b) => a.createdAt - b.createdAt || a.instanceId - b.instanceId),
    [tasks, leavingTasks],
  )

  const writeLeg = useMemo(
    (): DatabaseLeg | null =>
      isWriterAvailable
        ? { instanceEdgeId: JUNCTION_TO_WRITER_EDGE_ID, volumeEdgeId: WRITER_TO_VOLUME_EDGE_ID }
        : null,
    [isWriterAvailable],
  )

  const readLeg = useMemo(
    (): DatabaseLeg | null =>
      isReaderAvailable
        ? { instanceEdgeId: JUNCTION_TO_READER_EDGE_ID, volumeEdgeId: READER_TO_VOLUME_EDGE_ID }
        : writeLeg,
    [isReaderAvailable, writeLeg],
  )

  const isDatabaseReachable = writeLeg !== null || readLeg !== null

  const leavingIds = useMemo(() => new Set(leavingTasks.map((task) => task.id)), [leavingTasks])
  const healthyTaskCount = useMemo(() => tasks.filter((task) => task.status === 'healthy').length, [tasks])

  const { positions, sizes, targetGroupNode, serviceFrame } = useTaskColumnLayout({
    orderedTasks,
    isTargetGroupVisible,
    healthyTaskCount,
  })

  const taskNodes = useMemo(
    (): TaskFlowNode[] =>
      orderedTasks.map((task, index) => ({
        id: task.id,
        type: 'task',
        position: positions.get(task.id) ?? { x: 0, y: 0 },
        measured: sizes.get(task.id),
        data: {
          taskNumber: index + 1,
          status: task.status,
          stageEnteredAt: task.stageEnteredAt,
          createdAt: task.createdAt,
          requestsPerMinute: requestsByTaskId.get(task.id) ?? 0,
          latencyMs: taskLatencyMs,
          isLeaving: leavingIds.has(task.id),
        },
        draggable: false,
        deletable: false,
      })),
    [orderedTasks, positions, sizes, requestsByTaskId, leavingIds, taskLatencyMs],
  )

  const taskEdges = useMemo((): RequestFlowEdge[] => {
    const edges: RequestFlowEdge[] = []

    for (const task of orderedTasks) {
      const requestsPerMinute = requestsByTaskId.get(task.id) ?? 0

      if (isRegisteredTarget(task.status)) {
        edges.push({
          id: albToTaskEdgeId(task.id),
          type: 'requestFlow',
          source: ALB_NODE_ID,
          sourceHandle: 'out',
          target: task.id,
          targetHandle: 'in',
          data: { requestsPerMinute },
          deletable: false,
          reconnectable: false,
        })
      }

      if (isPullingImageStatus(task.status)) {
        edges.push({
          id: taskToRegistryEdgeId(task.id),
          type: 'requestFlow',
          source: task.id,
          sourceHandle: 'pull',
          target: INTERFACE_ENDPOINTS_NODE_ID,
          targetHandle: 'in',
          data: { requestsPerMinute: 0 },
          deletable: false,
          reconnectable: false,
        })

        edges.push({
          id: taskToStorageEdgeId(task.id),
          type: 'requestFlow',
          source: task.id,
          sourceHandle: 'pull',
          target: GATEWAY_ENDPOINT_NODE_ID,
          targetHandle: 'in',
          data: { requestsPerMinute: 0 },
          deletable: false,
          reconnectable: false,
        })
      }

      if (task.status !== 'healthy' || !isDatabaseReachable) continue

      edges.push({
        id: taskToJunctionEdgeId(task.id),
        type: 'requestFlow',
        source: task.id,
        sourceHandle: 'out',
        target: DB_JUNCTION_NODE_ID,
        targetHandle: 'in',
        data: { requestsPerMinute },
        deletable: false,
        reconnectable: false,
      })
    }

    return edges
  }, [orderedTasks, requestsByTaskId, isDatabaseReachable])

  const healthyTaskRoutes = useMemo(
    (): TaskRoute[] =>
      tasks
        .filter((task) => task.status === 'healthy')
        .map((task) => ({
          albEdgeId: albToTaskEdgeId(task.id),
          junctionEdgeId: isDatabaseReachable ? taskToJunctionEdgeId(task.id) : null,
          readLeg,
          writeLeg,
        })),
    [tasks, isDatabaseReachable, readLeg, writeLeg],
  )

  const imagePullRoutes = useMemo(
    (): ImagePullLegs[] =>
      orderedTasks
        .filter((task) => isPullingImageStatus(task.status))
        .map((task) => ({
          registryEgressEdgeId: taskToRegistryEdgeId(task.id),
          registryEdgeId: ENDPOINT_TO_ECR_EDGE_ID,
          storageEgressEdgeId: taskToStorageEdgeId(task.id),
          storageEdgeId: ENDPOINT_TO_STORAGE_EDGE_ID,
          secondsRemaining: pullSecondsRemaining(clock - task.createdAt, IMAGE_PULL_DURATION_MS, timeScale),
        })),
    [orderedTasks, clock, timeScale],
  )

  return { taskNodes, targetGroupNode, serviceFrame, taskEdges, healthyTaskRoutes, imagePullRoutes }
}
