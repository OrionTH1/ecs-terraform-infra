import type { TaskStatus } from '../types/task-data'

const RUNNING_STATUSES: TaskStatus[] = ['registering', 'healthy', 'draining']
const PENDING_STATUSES: TaskStatus[] = ['provisioning', 'starting']

export interface ServiceTaskCounts {
  running: number
  pending: number
}

export function countServiceTasks(statuses: TaskStatus[]): ServiceTaskCounts {
  return {
    running: statuses.filter((status) => RUNNING_STATUSES.includes(status)).length,
    pending: statuses.filter((status) => PENDING_STATUSES.includes(status)).length,
  }
}
