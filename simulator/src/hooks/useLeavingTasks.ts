import { useEffect, useRef, useState } from 'react'
import { NODE_LEAVE_MS } from '../canvas/initial-graph'
import type { TaskRuntime } from '../store/useSimulationStore'

export function useLeavingTasks(tasks: TaskRuntime[]): TaskRuntime[] {
  const [leaving, setLeaving] = useState<TaskRuntime[]>([])
  const previous = useRef<TaskRuntime[]>(tasks)

  useEffect(() => {
    const removed = previous.current.filter((task) => !tasks.some((current) => current.id === task.id))
    previous.current = tasks

    if (removed.length === 0) return

    setLeaving((current) => [...current, ...removed])
    const timeoutId = setTimeout(
      () => setLeaving((current) => current.filter((task) => !removed.some((gone) => gone.id === task.id))),
      NODE_LEAVE_MS,
    )
    return () => clearTimeout(timeoutId)
  }, [tasks])

  return leaving
}
