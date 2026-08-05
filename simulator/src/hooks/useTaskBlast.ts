import { useCallback } from 'react'
import { useActiveTool } from './useActiveTool'
import { useSimulationStore } from '../store/useSimulationStore'
import type { TaskStatus } from '../types/task-data'

interface TaskBlastArgs {
  taskId: string
  status: TaskStatus
}

export function useTaskBlast({ taskId, status }: TaskBlastArgs) {
  const activeTool = useActiveTool()
  const killTask = useSimulationStore((state) => state.killTask)

  const isTargetable = activeTool.targetsInstances && status !== 'failed' && status !== 'draining'

  const blast = useCallback(() => {
    if (!isTargetable) return
    killTask(taskId)
  }, [isTargetable, killTask, taskId])

  return { isTargetable, blast }
}
