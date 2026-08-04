import { useMemo } from 'react'
import {
  ECS_SERVICE_NODE_ID,
  FALLBACK_TASK_HEIGHT,
  RDS_NODE_ID,
  TASK_COLUMN_CENTER_Y,
  TASK_COLUMN_X,
  TASK_ROW_GAP,
} from '../canvas/initial-graph'
import { useLeavingTasks } from './useLeavingTasks'
import { useMeasuredTaskSizes } from './useMeasuredTaskSizes'
import type { TaskRuntime } from '../store/useSimulationStore'
import type { RequestFlowEdge } from '../types/edge-data'
import type { TaskFlowNode } from '../types/task-data'

interface TaskGraphArgs {
  tasks: TaskRuntime[]
  requestsByTaskId: Map<string, number>
}

export function useTaskGraph({ tasks, requestsByTaskId }: TaskGraphArgs) {
  const leavingTasks = useLeavingTasks(tasks)

  const orderedTasks = useMemo(
    () => [...tasks, ...leavingTasks].sort((a, b) => a.createdAt - b.createdAt || a.instanceId - b.instanceId),
    [tasks, leavingTasks],
  )

  const leavingIds = useMemo(() => new Set(leavingTasks.map((task) => task.id)), [leavingTasks])
  const measuredSizes = useMeasuredTaskSizes()

  const taskNodes = useMemo((): TaskFlowNode[] => {
    const heights = orderedTasks.map((task) => measuredSizes.get(task.id)?.height ?? FALLBACK_TASK_HEIGHT)
    const columnHeight = heights.reduce((sum, height) => sum + height, 0) + TASK_ROW_GAP * (heights.length - 1)

    let offset = TASK_COLUMN_CENTER_Y - columnHeight / 2

    return orderedTasks.map((task, index) => {
      const y = offset
      offset += heights[index] + TASK_ROW_GAP

      return {
        id: task.id,
        type: 'task',
        position: { x: TASK_COLUMN_X, y },
        measured: measuredSizes.get(task.id),
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
      }
    })
  }, [orderedTasks, requestsByTaskId, measuredSizes, leavingIds])

  const taskEdges = useMemo(
    (): RequestFlowEdge[] =>
      orderedTasks.map((task) => ({
        id: `${ECS_SERVICE_NODE_ID}-${task.id}`,
        type: 'requestFlow',
        source: ECS_SERVICE_NODE_ID,
        sourceHandle: 'out',
        target: task.id,
        targetHandle: 'in',
        data: { requestsPerMinute: requestsByTaskId.get(task.id) ?? 0 },
        deletable: false,
        reconnectable: false,
      })),
    [orderedTasks, requestsByTaskId],
  )

  const rdsEdges = useMemo(
    (): RequestFlowEdge[] =>
      orderedTasks.map((task) => ({
        id: `${task.id}-${RDS_NODE_ID}`,
        type: 'requestFlow',
        source: task.id,
        sourceHandle: 'out',
        target: RDS_NODE_ID,
        targetHandle: 'in',
        data: { requestsPerMinute: requestsByTaskId.get(task.id) ?? 0 },
        deletable: false,
        reconnectable: false,
      })),
    [orderedTasks, requestsByTaskId],
  )

  const healthyTaskEdgeIds = useMemo(
    () => tasks.filter((task) => task.status === 'healthy').map((task) => `${ECS_SERVICE_NODE_ID}-${task.id}`),
    [tasks],
  )

  return { taskNodes, taskEdges, rdsEdges, healthyTaskEdgeIds }
}
