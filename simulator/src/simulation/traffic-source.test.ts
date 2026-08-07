import { describe, expect, it } from 'vitest'
import { canReachLoadBalancer } from './traffic-source'
import type { SimulatorFlowNode } from '../types/node-data'

const ALB = 'alb'

function nodeOfType(id: string, type: string): SimulatorFlowNode {
  return { id, type, position: { x: 0, y: 0 }, data: {} } as unknown as SimulatorFlowNode
}

const user = nodeOfType('user-1', 'user')
const group = nodeOfType('group-1', 'userGroup')
const task = nodeOfType('task-1', 'task')

const NODES = [user, group, task]

describe('who is allowed to reach the load balancer', () => {
  it('lets an unconnected user in', () => {
    expect(canReachLoadBalancer(NODES, [], user.id, ALB)).toBe(true)
  })

  it('lets an unconnected group of users in', () => {
    expect(canReachLoadBalancer(NODES, [], group.id, ALB)).toBe(true)
  })

  it('refuses a second edge from a source that is already connected', () => {
    const edges = [{ source: user.id, target: ALB }]

    expect(canReachLoadBalancer(NODES, edges, user.id, ALB)).toBe(false)
  })

  it('still lets a different source in while one is connected', () => {
    const edges = [{ source: user.id, target: ALB }]

    expect(canReachLoadBalancer(NODES, edges, group.id, ALB)).toBe(true)
  })

  it('refuses anything that is not a traffic source', () => {
    expect(canReachLoadBalancer(NODES, [], task.id, ALB)).toBe(false)
  })

  it('refuses a node that is not on the canvas', () => {
    expect(canReachLoadBalancer(NODES, [], 'ghost', ALB)).toBe(false)
    expect(canReachLoadBalancer(NODES, [], null, ALB)).toBe(false)
  })

  it('ignores an edge that leaves the source but does not reach the load balancer', () => {
    const edges = [{ source: user.id, target: 'somewhere-else' }]

    expect(canReachLoadBalancer(NODES, edges, user.id, ALB)).toBe(true)
  })
})
