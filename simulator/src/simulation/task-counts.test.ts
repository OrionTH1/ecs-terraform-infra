import { describe, expect, it } from 'vitest'
import { countServiceTasks } from './task-counts'

describe('service task counts', () => {
  it('counts a task as running only once its container is up', () => {
    expect(countServiceTasks(['registering', 'healthy', 'draining'])).toEqual({ running: 3, pending: 0 })
  })

  it('counts a task the scheduler is still launching as pending', () => {
    expect(countServiceTasks(['provisioning', 'starting'])).toEqual({ running: 0, pending: 2 })
  })

  it('stops counting a task the moment it fails', () => {
    expect(countServiceTasks(['failed', 'failed', 'failed'])).toEqual({ running: 0, pending: 0 })
  })

  it('reports nothing running while every task is being replaced after a blast', () => {
    expect(countServiceTasks(['failed', 'provisioning', 'provisioning'])).toEqual({ running: 0, pending: 2 })
  })

  it('separates the two groups while the service converges', () => {
    expect(countServiceTasks(['healthy', 'healthy', 'provisioning'])).toEqual({ running: 2, pending: 1 })
  })

  it('reports zeroes for a service with no tasks at all', () => {
    expect(countServiceTasks([])).toEqual({ running: 0, pending: 0 })
  })
})
