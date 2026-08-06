import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  DB_JUNCTION_NODE_ID,
  JUNCTION_TO_READER_EDGE_ID,
  JUNCTION_TO_WRITER_EDGE_ID,
  READER_TO_VOLUME_EDGE_ID,
  WRITER_TO_VOLUME_EDGE_ID,
  albToTaskEdgeId,
  taskToJunctionEdgeId,
} from '../canvas/initial-graph'
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
  autoScalingPosition: { x: number; y: number }
  taskEdges: RequestFlowEdge[]
  healthyTaskRoutes: TaskRoute[]
}

export function useTaskGraph({
  tasks,
  requestsByTaskId,
  isTargetGroupVisible,
  isWriterAvailable,
  isReaderAvailable,
}: TaskGraphArgs): TaskGraph {
  const leavingTasks = useLeavingTasks(tasks)

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

  const { positions, sizes, targetGroupNode, serviceFrame, autoScalingPosition } = useTaskColumnLayout({
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
          log: task.log,
          createdAt: task.createdAt,
          requestsPerMinute: requestsByTaskId.get(task.id) ?? 0,
          isLeaving: leavingIds.has(task.id),
        },
        draggable: false,
        deletable: false,
      })),
    [orderedTasks, positions, sizes, requestsByTaskId, leavingIds],
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

  return { taskNodes, targetGroupNode, serviceFrame, autoScalingPosition, taskEdges, healthyTaskRoutes }
}
