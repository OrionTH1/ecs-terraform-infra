import { useEffect, useRef, useState } from 'react'
import { NODE_LEAVE_MS } from '../canvas/initial-graph'
import type { TaskRuntime } from '../store/useSimulationStore'

export function useLeavingTasks(tasks: TaskRuntime[]): TaskRuntime[] {
  const [leaving, setLeaving] = useState<TaskRuntime[]>([])
  const previous = useRef<TaskRuntime[]>(tasks)
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timeouts.current.forEach(clearTimeout), [])

  useEffect(() => {
    const removed = previous.current.filter((task) => !tasks.some((current) => current.id === task.id))
    previous.current = tasks

    if (removed.length === 0) return

    const removedIds = new Set(removed.map((task) => task.id))
    setLeaving((current) => [...current.filter((task) => !removedIds.has(task.id)), ...removed])

    const timeoutId = setTimeout(() => {
      setLeaving((current) => current.filter((task) => !removedIds.has(task.id)))
      timeouts.current = timeouts.current.filter((id) => id !== timeoutId)
    }, NODE_LEAVE_MS)

    timeouts.current.push(timeoutId)
  }, [tasks])

  return leaving
}
