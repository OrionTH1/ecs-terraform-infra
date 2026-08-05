import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  ECS_SERVICE_NODE_ID,
  RDS_CLUSTER_NODE_ID,
  albToTaskEdgeId,
  serviceToTaskEdgeId,
  taskToRdsEdgeId,
} from '../canvas/initial-graph'
import { isRegisteredTarget } from '../simulation/target-group'
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
  isRdsClusterVisible: boolean
}

export interface TaskGraph {
  taskNodes: TaskFlowNode[]
  servicePosition: { x: number; y: number }
  targetGroupNode: TargetGroupFlowNode | null
  taskEdges: (RequestFlowEdge | AssociationEdge)[]
  healthyTaskEdgeIds: string[]
}

export function useTaskGraph({
  tasks,
  requestsByTaskId,
  isTargetGroupVisible,
  isServiceVisible,
  isRdsClusterVisible,
}: TaskGraphArgs): TaskGraph {
  const leavingTasks = useLeavingTasks(tasks)

  const orderedTasks = useMemo(
    () => [...tasks, ...leavingTasks].sort((a, b) => a.createdAt - b.createdAt || a.instanceId - b.instanceId),
    [tasks, leavingTasks],
  )

  const leavingIds = useMemo(() => new Set(leavingTasks.map((task) => task.id)), [leavingTasks])
  const healthyTaskCount = useMemo(() => tasks.filter((task) => task.status === 'healthy').length, [tasks])

  const { positions, sizes, servicePosition, targetGroupNode } = useTaskColumnLayout({
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
          data: { isActive: task.status === 'failed', variant: 'management' },
          deletable: false,
          reconnectable: false,
          selectable: false,
        })
      }

      if (isRdsClusterVisible && task.status === 'healthy') {
        edges.push({
          id: taskToRdsEdgeId(task.id),
          type: 'requestFlow',
          source: task.id,
          sourceHandle: 'out',
          target: RDS_CLUSTER_NODE_ID,
          targetHandle: 'in',
          data: { requestsPerMinute },
          deletable: false,
          reconnectable: false,
        })
      }
    }

    return edges
  }, [orderedTasks, requestsByTaskId, isServiceVisible, isRdsClusterVisible])

  const healthyTaskEdgeIds = useMemo(
    () => tasks.filter((task) => task.status === 'healthy').map((task) => albToTaskEdgeId(task.id)),
    [tasks],
  )

  return { taskNodes, servicePosition, targetGroupNode, taskEdges, healthyTaskEdgeIds }
}
