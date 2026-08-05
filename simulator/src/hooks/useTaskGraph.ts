import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  ECS_SERVICE_NODE_ID,
  RDS_READER_NODE_ID,
  RDS_WRITER_NODE_ID,
  albToTaskEdgeId,
  serviceToTaskEdgeId,
  taskToReaderEdgeId,
  taskToWriterEdgeId,
} from '../canvas/initial-graph'
import { RDS_READ_FRACTION } from '../simulation/simulation-config'
import { isRegisteredTarget } from '../simulation/target-group'
import { splitReadWrite } from '../simulation/traffic-distribution'
import { useLeavingTasks } from './useLeavingTasks'
import { useTaskColumnLayout } from './useTaskColumnLayout'
import type { TaskRuntime } from '../store/useSimulationStore'
import type { AssociationEdge, RequestFlowEdge } from '../types/edge-data'
import type { TargetGroupFlowNode } from '../types/node-data'
import type { TaskFlowNode } from '../types/task-data'

interface TaskGraphArgs {
  tasks: TaskRuntime[]
  requestsByTaskId: Map<string, number>
  isTargetGroupVisible: boolean
  isServiceVisible: boolean
  isWriterVisible: boolean
  isReaderVisible: boolean
}

export interface TaskRoute {
  albEdgeId: string
  writerEdgeId: string | null
  readerEdgeId: string | null
}

export interface TaskGraph {
  taskNodes: TaskFlowNode[]
  servicePosition: { x: number; y: number }
  writerPosition: { x: number; y: number }
  readerPosition: { x: number; y: number }
  targetGroupNode: TargetGroupFlowNode | null
  taskEdges: (RequestFlowEdge | AssociationEdge)[]
  healthyTaskRoutes: TaskRoute[]
}

export function useTaskGraph({
  tasks,
  requestsByTaskId,
  isTargetGroupVisible,
  isServiceVisible,
  isWriterVisible,
  isReaderVisible,
}: TaskGraphArgs): TaskGraph {
  const leavingTasks = useLeavingTasks(tasks)

  const orderedTasks = useMemo(
    () => [...tasks, ...leavingTasks].sort((a, b) => a.createdAt - b.createdAt || a.instanceId - b.instanceId),
    [tasks, leavingTasks],
  )

  const leavingIds = useMemo(() => new Set(leavingTasks.map((task) => task.id)), [leavingTasks])
  const healthyTaskCount = useMemo(() => tasks.filter((task) => task.status === 'healthy').length, [tasks])

  const { positions, sizes, servicePosition, writerPosition, readerPosition, targetGroupNode } = useTaskColumnLayout({
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

  const taskEdges = useMemo((): (RequestFlowEdge | AssociationEdge)[] => {
    const edges: (RequestFlowEdge | AssociationEdge)[] = []

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

      if (isServiceVisible) {
        edges.push({
          id: serviceToTaskEdgeId(task.id),
          type: 'association',
          source: ECS_SERVICE_NODE_ID,
          sourceHandle: 'manages-out',
          target: task.id,
          targetHandle: 'manages-in',
          data: { isActive: task.status === 'failed', variant: 'management', routing: 'bus' },
          deletable: false,
          reconnectable: false,
          selectable: false,
        })
      }

      if (task.status !== 'healthy') continue

      const { reads, writes } = splitReadWrite(requestsPerMinute, RDS_READ_FRACTION)

      if (isWriterVisible) {
        edges.push({
          id: taskToWriterEdgeId(task.id),
          type: 'requestFlow',
          source: task.id,
          sourceHandle: 'out',
          target: RDS_WRITER_NODE_ID,
          targetHandle: 'in',
          data: { requestsPerMinute: writes },
          deletable: false,
          reconnectable: false,
        })
      }

      if (isReaderVisible) {
        edges.push({
          id: taskToReaderEdgeId(task.id),
          type: 'requestFlow',
          source: task.id,
          sourceHandle: 'out',
          target: RDS_READER_NODE_ID,
          targetHandle: 'in',
          data: { requestsPerMinute: reads },
          deletable: false,
          reconnectable: false,
        })
      }
    }

    return edges
  }, [orderedTasks, requestsByTaskId, isServiceVisible, isWriterVisible, isReaderVisible])

  const healthyTaskRoutes = useMemo(
    (): TaskRoute[] =>
      tasks
        .filter((task) => task.status === 'healthy')
        .map((task) => ({
          albEdgeId: albToTaskEdgeId(task.id),
          writerEdgeId: isWriterVisible ? taskToWriterEdgeId(task.id) : null,
          readerEdgeId: isReaderVisible ? taskToReaderEdgeId(task.id) : null,
        })),
    [tasks, isWriterVisible, isReaderVisible],
  )

  return { taskNodes, servicePosition, writerPosition, readerPosition, targetGroupNode, taskEdges, healthyTaskRoutes }
}
