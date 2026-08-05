import { useMemo } from 'react'
import {
  ECS_SERVICE_GAP,
  ECS_SERVICE_NODE_ID,
  FALLBACK_ECS_SERVICE_HEIGHT,
  FALLBACK_RDS_INSTANCE_HEIGHT,
  RDS_INSTANCE_COLUMN_X,
  RDS_INSTANCE_GAP,
  RDS_WRITER_NODE_ID,
  FALLBACK_TASK_HEIGHT,
  FALLBACK_TASK_WIDTH,
  TARGET_GROUP_HEADER_HEIGHT,
  TARGET_GROUP_MIN_HEIGHT,
  TARGET_GROUP_NODE_ID,
  TARGET_GROUP_PADDING,
  TARGET_GROUP_ZONE_GAP,
  TASK_COLUMN_CENTER_Y,
  TASK_COLUMN_X,
  TASK_ROW_GAP,
} from '../canvas/initial-graph'
import { isRegisteredTarget } from '../simulation/target-group'
import { useMeasuredNodeSizes, type MeasuredSize } from './useMeasuredNodeSizes'
import type { TaskRuntime } from '../store/useSimulationStore'
import type { TargetGroupFlowNode } from '../types/node-data'

interface TaskColumnLayoutArgs {
  orderedTasks: TaskRuntime[]
  isTargetGroupVisible: boolean
  healthyTaskCount: number
}

export interface TaskColumnLayout {
  positions: Map<string, { x: number; y: number }>
  sizes: Map<string, MeasuredSize>
  servicePosition: { x: number; y: number }
  writerPosition: { x: number; y: number }
  readerPosition: { x: number; y: number }
  targetGroupNode: TargetGroupFlowNode | null
}

const TARGET_GROUP_TOOLTIP =
  'The ALB listener forwards to this target group, not to the ECS service. A task is registered here as soon as its container starts, but it only receives traffic after passing consecutive health checks — that gap is why scaling out is not instant. The ECS service registers and deregisters the targets; it never carries a request itself.'

function stackHeights(tasks: TaskRuntime[], sizes: Map<string, MeasuredSize>): number[] {
  return tasks.map((task) => sizes.get(task.id)?.height ?? FALLBACK_TASK_HEIGHT)
}

function totalStackHeight(heights: number[]): number {
  if (heights.length === 0) return 0
  return heights.reduce((sum, height) => sum + height, 0) + TASK_ROW_GAP * (heights.length - 1)
}

export function useTaskColumnLayout({
  orderedTasks,
  isTargetGroupVisible,
  healthyTaskCount,
}: TaskColumnLayoutArgs): TaskColumnLayout {
  const sizes = useMeasuredNodeSizes()

  return useMemo(() => {
    const registered = orderedTasks.filter((task) => isRegisteredTarget(task.status))
    const unregistered = orderedTasks.filter((task) => !isRegisteredTarget(task.status))

    const registeredHeights = stackHeights(registered, sizes)
    const unregisteredHeights = stackHeights(unregistered, sizes)

    const frameWidth =
      Math.max(...orderedTasks.map((task) => sizes.get(task.id)?.width ?? 0), FALLBACK_TASK_WIDTH) +
      TARGET_GROUP_PADDING * 2

    const frameHeight = Math.max(
      TARGET_GROUP_MIN_HEIGHT,
      TARGET_GROUP_HEADER_HEIGHT + TARGET_GROUP_PADDING * 2 + totalStackHeight(registeredHeights),
    )

    const unregisteredHeight = totalStackHeight(unregisteredHeights)
    const columnHeight = frameHeight + (unregistered.length > 0 ? TARGET_GROUP_ZONE_GAP + unregisteredHeight : 0)
    const columnTop = TASK_COLUMN_CENTER_Y - columnHeight / 2

    const positions = new Map<string, { x: number; y: number }>()

    let offset = columnTop + TARGET_GROUP_HEADER_HEIGHT + TARGET_GROUP_PADDING
    registered.forEach((task, index) => {
      positions.set(task.id, { x: TASK_COLUMN_X, y: offset })
      offset += registeredHeights[index] + TASK_ROW_GAP
    })

    offset = columnTop + frameHeight + TARGET_GROUP_ZONE_GAP
    unregistered.forEach((task, index) => {
      positions.set(task.id, { x: TASK_COLUMN_X, y: offset })
      offset += unregisteredHeights[index] + TASK_ROW_GAP
    })

    const serviceHeight = sizes.get(ECS_SERVICE_NODE_ID)?.height ?? FALLBACK_ECS_SERVICE_HEIGHT
    const servicePosition = { x: TASK_COLUMN_X, y: columnTop - ECS_SERVICE_GAP - serviceHeight }

    const writerHeight = sizes.get(RDS_WRITER_NODE_ID)?.height ?? FALLBACK_RDS_INSTANCE_HEIGHT
    const writerPosition = { x: RDS_INSTANCE_COLUMN_X, y: columnTop - RDS_INSTANCE_GAP - writerHeight }
    const readerPosition = { x: RDS_INSTANCE_COLUMN_X, y: columnTop + columnHeight + RDS_INSTANCE_GAP }

    const targetGroupNode: TargetGroupFlowNode | null = isTargetGroupVisible
      ? {
          id: TARGET_GROUP_NODE_ID,
          type: 'targetGroup',
          position: { x: TASK_COLUMN_X - TARGET_GROUP_PADDING, y: columnTop },
          data: {
            label: 'Target Group',
            tooltip: TARGET_GROUP_TOOLTIP,
            status: 'idle',
            width: frameWidth,
            height: frameHeight,
            registeredTargetCount: registered.length,
            healthyTargetCount: healthyTaskCount,
          },
          draggable: false,
          deletable: false,
          selectable: false,
          zIndex: -1,
        }
      : null

    return { positions, sizes, servicePosition, writerPosition, readerPosition, targetGroupNode }
  }, [orderedTasks, sizes, isTargetGroupVisible, healthyTaskCount])
}
