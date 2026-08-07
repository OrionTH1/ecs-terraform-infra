import { describe, expect, it } from 'vitest'
import { buildImagePullItinerary, isPullingImage, isPullingImageStatus } from './image-pull'
import type { TaskStatus } from '../types/task-data'

const TASK_TO_INTERFACE = 'task-1-interface-endpoints'
const INTERFACE_TO_ECR = 'interface-endpoints-ecr'
const TASK_TO_GATEWAY = 'task-1-gateway-endpoint'
const GATEWAY_TO_STORAGE = 'gateway-endpoint-layer-storage'

const LEGS = {
  registryEgressEdgeId: TASK_TO_INTERFACE,
  registryEdgeId: INTERFACE_TO_ECR,
  storageEgressEdgeId: TASK_TO_GATEWAY,
  storageEdgeId: GATEWAY_TO_STORAGE,
}

const EVERYTHING_UP = new Set([TASK_TO_INTERFACE, INTERFACE_TO_ECR, TASK_TO_GATEWAY, GATEWAY_TO_STORAGE])

function shape(liveEdgeIds = EVERYTHING_UP) {
  return buildImagePullItinerary(LEGS, liveEdgeIds).map((leg) => `${leg.edgeId}${leg.reversed ? ' back' : ''}`)
}

describe('what a layer download looks like on the wire', () => {
  it('asks the registry first and only then reads the bytes from storage', () => {
    expect(shape()).toEqual([
      TASK_TO_INTERFACE,
      INTERFACE_TO_ECR,
      `${INTERFACE_TO_ECR} back`,
      `${TASK_TO_INTERFACE} back`,
      TASK_TO_GATEWAY,
      GATEWAY_TO_STORAGE,
      `${GATEWAY_TO_STORAGE} back`,
      `${TASK_TO_GATEWAY} back`,
    ])
  })

  it('returns to the task between the two round trips, because the task makes both of them', () => {
    const legs = buildImagePullItinerary(LEGS, EVERYTHING_UP)
    const leavingTheTaskAgain = legs.findIndex((leg) => leg.edgeId === TASK_TO_GATEWAY && !leg.reversed)
    const backAtTheTask = legs.findIndex((leg) => leg.edgeId === TASK_TO_INTERFACE && leg.reversed)

    expect(backAtTheTask).toBeLessThan(leavingTheTaskAgain)
  })

  it('never sends a packet from the registry to storage, since ecr hands over a url and not bytes', () => {
    const legs = buildImagePullItinerary(LEGS, EVERYTHING_UP)

    for (let index = 1; index < legs.length; index += 1) {
      const crossed = legs[index - 1].edgeId === INTERFACE_TO_ECR && legs[index].edgeId === GATEWAY_TO_STORAGE
      expect(crossed).toBe(false)
    }
  })

  it('marks every leg as image pull traffic so it reads apart from a request', () => {
    const colours = new Set(buildImagePullItinerary(LEGS, EVERYTHING_UP).map((leg) => leg.color))

    expect(colours).toEqual(new Set(['pull']))
  })

  it('drops the legs whose edge is gone instead of stranding a packet on it', () => {
    const withoutStorage = new Set([TASK_TO_INTERFACE, INTERFACE_TO_ECR])

    expect(shape(withoutStorage)).toEqual([
      TASK_TO_INTERFACE,
      INTERFACE_TO_ECR,
      `${INTERFACE_TO_ECR} back`,
      `${TASK_TO_INTERFACE} back`,
    ])
  })

  it('gives back nothing at all when no edge survives', () => {
    expect(buildImagePullItinerary(LEGS, new Set())).toEqual([])
  })
})

describe('which tasks are pulling', () => {
  const statuses = (...values: TaskStatus[]) => values

  it('counts a task that is still being placed and one that is starting its container', () => {
    expect(isPullingImageStatus('provisioning')).toBe(true)
    expect(isPullingImageStatus('starting')).toBe(true)
  })

  it('stops counting once the task is waiting on health checks', () => {
    expect(isPullingImageStatus('registering')).toBe(false)
    expect(isPullingImageStatus('healthy')).toBe(false)
  })

  it('never counts a task on its way out', () => {
    expect(isPullingImage(statuses('draining', 'failed'))).toBe(false)
  })

  it('reports a pull while any one task is still fetching, however many are healthy', () => {
    expect(isPullingImage(statuses('healthy', 'healthy', 'starting'))).toBe(true)
  })
})
