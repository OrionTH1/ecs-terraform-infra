import { create } from 'zustand'
import { AUTOSCALING, TASK_LIFECYCLE, targetRequestsPerSecondPerTask } from '../simulation/simulation-config'
import type { TaskStatus } from '../types/task-data'

const TICK_MS = 500
/** Scale-in only kicks in once load is comfortably below target, to avoid flapping right at the line. */
const SCALE_IN_MARGIN = 0.7

interface TaskRuntime {
  id: string
  taskNumber: number
  status: TaskStatus
  stageEnteredAt: number
  log: string[]
}

interface SimulationState {
  tasks: TaskRuntime[]
  currentRps: number
  lastScaleOutAt: number
  lastScaleInAt: number
  nextTaskNumber: number
  clockStarted: boolean
  setCurrentRps: (rps: number) => void
  startClock: () => void
}

function createInitialTasks(): TaskRuntime[] {
  const now = Date.now()
  return [1, 2].map((taskNumber) => ({
    id: `task-${taskNumber}`,
    taskNumber,
    status: 'healthy' as const,
    stageEnteredAt: now,
    log: ['Passed ALB health checks'],
  }))
}

function advanceTask(task: TaskRuntime, now: number): TaskRuntime | null {
  const elapsed = now - task.stageEnteredAt

  if (task.status === 'provisioning' && elapsed >= TASK_LIFECYCLE.provisioningMs) {
    return { ...task, status: 'starting', stageEnteredAt: now, log: [...task.log, 'Image pulled from ECR'] }
  }
  if (task.status === 'starting' && elapsed >= TASK_LIFECYCLE.startingMs) {
    return { ...task, status: 'registering', stageEnteredAt: now, log: [...task.log, 'Container started, registering with target group'] }
  }
  if (task.status === 'registering' && elapsed >= TASK_LIFECYCLE.registeringMs) {
    return { ...task, status: 'healthy', stageEnteredAt: now, log: [...task.log, 'Passed ALB health checks'] }
  }
  if (task.status === 'draining' && elapsed >= TASK_LIFECYCLE.drainingMs) {
    return null
  }
  return task
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  tasks: createInitialTasks(),
  currentRps: 0,
  lastScaleOutAt: 0,
  lastScaleInAt: 0,
  nextTaskNumber: 3,
  clockStarted: false,

  setCurrentRps: (rps) => set({ currentRps: rps }),

  startClock: () => {
    if (get().clockStarted) return
    set({ clockStarted: true })

    setInterval(() => {
      const now = Date.now()
      const state = get()

      const tasks = state.tasks.map((task) => advanceTask(task, now)).filter((task): task is TaskRuntime => task !== null)

      const healthyCount = tasks.filter((task) => task.status === 'healthy').length
      const totalCount = tasks.length
      const avgRpsPerHealthyTask = state.currentRps / Math.max(healthyCount, 1)

      const canScaleOut = now - state.lastScaleOutAt >= AUTOSCALING.scaleOutCooldownMs
      const canScaleIn = now - state.lastScaleInAt >= AUTOSCALING.scaleInCooldownMs

      if (avgRpsPerHealthyTask > targetRequestsPerSecondPerTask && totalCount < AUTOSCALING.maxCapacity && canScaleOut) {
        set({
          tasks: [
            ...tasks,
            {
              id: `task-${state.nextTaskNumber}`,
              taskNumber: state.nextTaskNumber,
              status: 'provisioning',
              stageEnteredAt: now,
              log: ['Provisioning task (pulling image from ECR)'],
            },
          ],
          nextTaskNumber: state.nextTaskNumber + 1,
          lastScaleOutAt: now,
        })
        return
      }

      if (avgRpsPerHealthyTask < targetRequestsPerSecondPerTask * SCALE_IN_MARGIN && totalCount > AUTOSCALING.minCapacity && canScaleIn) {
        const drainTargetIndex = tasks.map((task) => task.status).lastIndexOf('healthy')
        if (drainTargetIndex !== -1) {
          set({
            tasks: tasks.map((task, index) =>
              index === drainTargetIndex
                ? { ...task, status: 'draining', stageEnteredAt: now, log: [...task.log, 'Deregistering from target group'] }
                : task,
            ),
            lastScaleInAt: now,
          })
          return
        }
      }

      set({ tasks })
    }, TICK_MS)
  },
}))
