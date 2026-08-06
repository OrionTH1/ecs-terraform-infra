import type { TaskStatus } from '../types/task-data'

const REPLACED_STATUSES: TaskStatus[] = ['draining', 'failed']

export function isRunningTask(status: TaskStatus): boolean {
  return !REPLACED_STATUSES.includes(status)
}

export function selectDrainIndexes(statuses: TaskStatus[], scaleInTarget: number): number[] {
  const excessTaskCount = statuses.filter(isRunningTask).length - scaleInTarget
  if (excessTaskCount <= 0) return []

  const healthyIndexes = statuses.reduce<number[]>((indexes, status, index) => {
    if (status === 'healthy') indexes.push(index)
    return indexes
  }, [])

  return healthyIndexes.slice(-excessTaskCount)
}
