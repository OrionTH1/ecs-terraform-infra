import { useMemo } from 'react'
import {
  AUTO_SCALING_GAP,
  AUTO_SCALING_NODE_ID,
  FALLBACK_AUTO_SCALING_HEIGHT,
  FALLBACK_TASK_HEIGHT,
  FALLBACK_TASK_WIDTH,
  TARGET_GROUP_NODE_ID,
  TASK_COLUMN_CENTER_Y,
  TASK_COLUMN_GAP,
  TASK_COLUMN_X,
  TASK_ROW_GAP,
  TASK_ZONE_GAP,
} from '../canvas/initial-graph'
import { gridHeight, gridWidth, taskColumnCount, taskColumnOf } from '../canvas/task-grid'
import {
  frameContentOriginY,
  frameHeightFor,
  frameLeftFor,
  frameWidthFor,
  type FrameBox,
} from '../canvas/frame-metrics'
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
  targetGroupNode: TargetGroupFlowNode | null
  serviceFrame: FrameBox
  autoScalingPosition: { x: number; y: number }
  downstreamOriginX: number
}

const TARGET_GROUP_TOOLTIP =
  'The ALB listener forwards to this target group, not to the ECS service. A task is registered here as soon as its container starts, but it only receives traffic after passing consecutive health checks — that gap is why scaling out is not instant. Tasks below this band belong to the service but are not registered yet, so no request can reach them.'

function stackHeights(tasks: TaskRuntime[], sizes: Map<string, MeasuredSize>): number[] {
  return tasks.map((task) => sizes.get(task.id)?.height ?? FALLBACK_TASK_HEIGHT)
}

function stackFrom(
  top: number,
  tasks: TaskRuntime[],
  heights: number[],
  columnWidth: number,
  positions: Map<string, { x: number; y: number }>,
) {
  const columnOffsets = new Map<number, number>()

  tasks.forEach((task, index) => {
    const column = taskColumnOf(index)
    const offset = columnOffsets.get(column) ?? top

    positions.set(task.id, { x: TASK_COLUMN_X + column * (columnWidth + TASK_COLUMN_GAP), y: offset })
    columnOffsets.set(column, offset + heights[index] + TASK_ROW_GAP)
  })
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

    const taskWidth = Math.max(
      ...orderedTasks.map((task) => sizes.get(task.id)?.width ?? 0),
      FALLBACK_TASK_WIDTH,
    )

    const columnCount = Math.max(taskColumnCount(registered.length), taskColumnCount(unregistered.length))
    const gridSpan = gridWidth(columnCount, taskWidth, TASK_COLUMN_GAP)

    const targetGroupWidth = frameWidthFor(gridSpan)
    const targetGroupLeft = frameLeftFor(TASK_COLUMN_X, gridSpan, targetGroupWidth)
    const targetGroupHeight = frameHeightFor(gridHeight(registeredHeights, TASK_ROW_GAP))

    const unregisteredZoneHeight =
      unregistered.length > 0 ? TASK_ZONE_GAP + gridHeight(unregisteredHeights, TASK_ROW_GAP) : 0

    const serviceWidth = frameWidthFor(targetGroupWidth)
    const serviceHeight = frameHeightFor(targetGroupHeight + unregisteredZoneHeight)

    const serviceFrame: FrameBox = {
      position: {
        x: frameLeftFor(targetGroupLeft, targetGroupWidth, serviceWidth),
        y: TASK_COLUMN_CENTER_Y - serviceHeight / 2,
      },
      width: serviceWidth,
      height: serviceHeight,
    }

    const targetGroupTop = frameContentOriginY(serviceFrame.position.y)

    const positions = new Map<string, { x: number; y: number }>()
    stackFrom(frameContentOriginY(targetGroupTop), registered, registeredHeights, taskWidth, positions)
    stackFrom(
      targetGroupTop + targetGroupHeight + TASK_ZONE_GAP,
      unregistered,
      unregisteredHeights,
      taskWidth,
      positions,
    )

    const autoScalingSize = sizes.get(AUTO_SCALING_NODE_ID)
    const autoScalingHeight = autoScalingSize?.height ?? FALLBACK_AUTO_SCALING_HEIGHT
    const autoScalingPosition = {
      x: TASK_COLUMN_X + (gridSpan - (autoScalingSize?.width ?? FALLBACK_TASK_WIDTH)) / 2,
      y: serviceFrame.position.y - AUTO_SCALING_GAP - autoScalingHeight,
    }

    const targetGroupNode: TargetGroupFlowNode | null = isTargetGroupVisible
      ? {
          id: TARGET_GROUP_NODE_ID,
          type: 'targetGroup',
          position: { x: targetGroupLeft, y: targetGroupTop },
          data: {
            label: 'Target Group',
            tooltip: TARGET_GROUP_TOOLTIP,
            status: 'idle',
            width: targetGroupWidth,
            height: targetGroupHeight,
            registeredTargetCount: registered.length,
            healthyTargetCount: healthyTaskCount,
          },
          draggable: false,
          deletable: false,
          selectable: false,
          zIndex: -1,
        }
      : null

    return {
      positions,
      sizes,
      targetGroupNode,
      serviceFrame,
      autoScalingPosition,
      downstreamOriginX: serviceFrame.position.x + serviceFrame.width,
    }
  }, [orderedTasks, sizes, isTargetGroupVisible, healthyTaskCount])
}
