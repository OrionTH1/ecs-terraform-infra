import { create } from 'zustand'
import { AUTOSCALING, DEFAULT_TIME_SCALE, TASK_LIFECYCLE } from '../simulation/simulation-config'
import type { TaskLogEntry, TaskStatus } from '../types/task-data'

const SCALE_IN_MARGIN = 0.7

export interface TaskRuntime {
  id: string
  taskNumber: number
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
  nextInstanceId: number
  expandedTaskIds: string[]
  toggleTaskLog: (taskId: string) => void
  setCurrentRequestRate: (requestsPerMinute: number) => void
  setTimeScale: (timeScale: number) => void
  tick: (elapsedRealMs: number) => void
}

function createInitialTasks(): TaskRuntime[] {
  return [1, 2].map((taskNumber) => ({
    id: `task-${taskNumber}`,
    taskNumber,
    status: 'healthy' as const,
    stageEnteredAt: 0,
    createdAt: 0,
    log: [{ message: 'Passed ALB health checks', atMs: 0 }],
  }))
}

function lowestFreeTaskNumber(tasks: TaskRuntime[]): number {
  const used = new Set(tasks.map((task) => task.taskNumber))
  let taskNumber = 1
  while (used.has(taskNumber)) taskNumber += 1
  return taskNumber
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
  tasks: createInitialTasks(),
  currentRequestRate: 0,
  clock: 0,
  timeScale: DEFAULT_TIME_SCALE,
  lastScaleOutAt: -Infinity,
  lastScaleInAt: -Infinity,
  nextInstanceId: 3,
  expandedTaskIds: [],

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

    if (scaleOutTarget > activeCount && canScaleOut) {
      const added: TaskRuntime[] = []
      for (let instance = 0; instance < scaleOutTarget - activeCount; instance += 1) {
        added.push({
          id: `task-${state.nextInstanceId + instance}`,
          taskNumber: lowestFreeTaskNumber([...tasks, ...added]),
          status: 'provisioning',
          stageEnteredAt: now,
          createdAt: now,
          log: [{ message: 'Pulling image from ECR', atMs: now }],
        })
      }

      set({
        clock: now,
        tasks: [...tasks, ...added],
        nextInstanceId: state.nextInstanceId + added.length,
        lastScaleOutAt: now,
      })
      return
    }

    if (scaleInTarget < activeCount && canScaleIn) {
      const drainTargetIndex = tasks.map((task) => task.status).lastIndexOf('healthy')
      if (drainTargetIndex !== -1) {
        set({
          clock: now,
          tasks: tasks.map((task, index) =>
            index === drainTargetIndex
              ? { ...task, status: 'draining', stageEnteredAt: now, log: [...task.log, { message: 'Deregistering from target group', atMs: now }] }
              : task,
          ),
          lastScaleInAt: now,
        })
        return
      }
    }

    if (!lifecycleChanged) {
      set({ clock: now })
      return
    }

    const liveTaskIds = new Set(tasks.map((task) => task.id))
    const expandedTaskIds = state.expandedTaskIds.filter((id) => liveTaskIds.has(id))

    set({
      clock: now,
      tasks,
      expandedTaskIds: expandedTaskIds.length === state.expandedTaskIds.length ? state.expandedTaskIds : expandedTaskIds,
    })
  },
}))
