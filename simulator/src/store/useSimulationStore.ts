import { create } from 'zustand'
import { AUTOSCALING, DEFAULT_TIME_SCALE, TASK_LIFECYCLE } from '../simulation/simulation-config'
import type { TaskLogEntry, TaskStatus } from '../types/task-data'

const SCALE_IN_MARGIN = 0.7

export interface TaskRuntime {
  id: string
  instanceId: number
  status: TaskStatus
  stageEnteredAt: number
  createdAt: number
  log: TaskLogEntry[]
}

interface SimulationState {
  tasks: TaskRuntime[]
  currentRequestRate: number
  clock: number
  timeScale: number
  lastScaleOutAt: number
  lastScaleInAt: number
  scaleOutBreachAt: number | null
  scaleInBreachAt: number | null
  nextInstanceId: number
  expandedTaskIds: string[]
  hasStarted: boolean
  markStarted: () => void
  toggleTaskLog: (taskId: string) => void
  setCurrentRequestRate: (requestsPerMinute: number) => void
  setTimeScale: (timeScale: number) => void
  tick: (elapsedRealMs: number) => void
}

function createInitialTasks(): TaskRuntime[] {
  return Array.from({ length: AUTOSCALING.minCapacity }, (_, index) => ({
    id: `task-${index + 1}`,
    instanceId: index + 1,
    status: 'provisioning' as const,
    stageEnteredAt: 0,
    createdAt: 0,
    log: [{ message: 'Pulling image from ECR', atMs: 0 }],
  }))
}

function desiredTaskCount(requestsPerMinute: number, targetPerTask: number): number {
  return Math.min(AUTOSCALING.maxCapacity, Math.max(AUTOSCALING.minCapacity, Math.ceil(requestsPerMinute / targetPerTask)))
}

function advanceTask(task: TaskRuntime, now: number): TaskRuntime | null {
  const elapsed = now - task.stageEnteredAt

  if (task.status === 'provisioning' && elapsed >= TASK_LIFECYCLE.provisioningMs) {
    return { ...task, status: 'starting', stageEnteredAt: now, log: [...task.log, { message: 'Image pulled, starting container', atMs: now }] }
  }
  if (task.status === 'starting' && elapsed >= TASK_LIFECYCLE.startingMs) {
    return { ...task, status: 'registering', stageEnteredAt: now, log: [...task.log, { message: 'Registering with target group', atMs: now }] }
  }
  if (task.status === 'registering' && elapsed >= TASK_LIFECYCLE.registeringMs) {
    return { ...task, status: 'healthy', stageEnteredAt: now, log: [...task.log, { message: 'Passed ALB health checks', atMs: now }] }
  }
  if (task.status === 'draining' && elapsed >= TASK_LIFECYCLE.drainingMs) {
    return null
  }
  return task
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  tasks: [],
  currentRequestRate: 0,
  clock: 0,
  timeScale: DEFAULT_TIME_SCALE,
  lastScaleOutAt: -Infinity,
  lastScaleInAt: -Infinity,
  scaleOutBreachAt: null,
  scaleInBreachAt: null,
  nextInstanceId: AUTOSCALING.minCapacity + 1,
  expandedTaskIds: [],
  hasStarted: false,

  markStarted: () => set((state) => (state.hasStarted ? state : { hasStarted: true, tasks: createInitialTasks() })),

  toggleTaskLog: (taskId) =>
    set((state) => ({
      expandedTaskIds: state.expandedTaskIds.includes(taskId)
        ? state.expandedTaskIds.filter((id) => id !== taskId)
        : [...state.expandedTaskIds, taskId],
    })),

  setCurrentRequestRate: (requestsPerMinute) => set({ currentRequestRate: requestsPerMinute }),

  setTimeScale: (timeScale) => set({ timeScale }),

  tick: (elapsedRealMs) => {
    const state = get()
    const now = state.clock + elapsedRealMs * state.timeScale

    const advanced = state.tasks.map((task) => advanceTask(task, now)).filter((task): task is TaskRuntime => task !== null)
    const lifecycleChanged =
      advanced.length !== state.tasks.length || advanced.some((task, index) => task !== state.tasks[index])
    const tasks = lifecycleChanged ? advanced : state.tasks

    const activeCount = tasks.filter((task) => task.status !== 'draining').length
    const scaleOutTarget = desiredTaskCount(state.currentRequestRate, AUTOSCALING.targetRequestsPerMinutePerTask)
    const scaleInTarget = desiredTaskCount(state.currentRequestRate, AUTOSCALING.targetRequestsPerMinutePerTask * SCALE_IN_MARGIN)

    const canScaleOut = now - state.lastScaleOutAt >= AUTOSCALING.scaleOutCooldownMs
    const canScaleIn = now - state.lastScaleInAt >= AUTOSCALING.scaleInCooldownMs

    const scaleOutBreachAt = scaleOutTarget > activeCount ? (state.scaleOutBreachAt ?? now) : null
    const scaleInBreachAt = scaleInTarget < activeCount ? (state.scaleInBreachAt ?? now) : null

    const scaleOutAlarm = scaleOutBreachAt !== null && now - scaleOutBreachAt >= AUTOSCALING.scaleOutEvaluationMs
    const scaleInAlarm = scaleInBreachAt !== null && now - scaleInBreachAt >= AUTOSCALING.scaleInEvaluationMs

    if (scaleOutAlarm && canScaleOut) {
      const added: TaskRuntime[] = Array.from({ length: scaleOutTarget - activeCount }, (_, offset) => {
        const instanceId = state.nextInstanceId + offset
        return {
          id: `task-${instanceId}`,
          instanceId,
          status: 'provisioning' as const,
          stageEnteredAt: now,
          createdAt: now,
          log: [{ message: 'Pulling image from ECR', atMs: now }],
        }
      })

      set({
        clock: now,
        tasks: [...tasks, ...added],
        nextInstanceId: state.nextInstanceId + added.length,
        lastScaleOutAt: now,
        scaleOutBreachAt: null,
        scaleInBreachAt: null,
      })
      return
    }

    if (scaleInAlarm && canScaleIn) {
      const healthyIndexes = tasks.reduce<number[]>((indexes, task, index) => {
        if (task.status === 'healthy') indexes.push(index)
        return indexes
      }, [])
      const drainIndexes = new Set(healthyIndexes.slice(-(activeCount - scaleInTarget)))

      if (drainIndexes.size > 0) {
        set({
          clock: now,
          tasks: tasks.map((task, index) =>
            drainIndexes.has(index)
              ? { ...task, status: 'draining', stageEnteredAt: now, log: [...task.log, { message: 'Deregistering from target group', atMs: now }] }
              : task,
          ),
          lastScaleInAt: now,
          scaleOutBreachAt: null,
          scaleInBreachAt: null,
        })
        return
      }
    }

    if (!lifecycleChanged) {
      set({ clock: now, scaleOutBreachAt, scaleInBreachAt })
      return
    }

    const liveTaskIds = new Set(tasks.map((task) => task.id))
    const expandedTaskIds = state.expandedTaskIds.filter((id) => liveTaskIds.has(id))

    set({
      clock: now,
      tasks,
      scaleOutBreachAt,
      scaleInBreachAt,
      expandedTaskIds: expandedTaskIds.length === state.expandedTaskIds.length ? state.expandedTaskIds : expandedTaskIds,
    })
  },
}))
