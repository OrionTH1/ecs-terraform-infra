import type { TaskStatus } from '../types/task-data'

const REGISTERED_STATUSES: TaskStatus[] = ['registering', 'healthy', 'draining']

export function isRegisteredTarget(status: TaskStatus): boolean {
  return REGISTERED_STATUSES.includes(status)
}
