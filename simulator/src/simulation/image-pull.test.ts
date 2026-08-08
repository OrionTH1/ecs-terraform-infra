import { describe, expect, it } from 'vitest'
import {

  buildImagePullItinerary,
  imagePullSpeed,
  pullDwellMs,
  isPullingImage,
  travelSecondsFor,
  isPullingImageStatus,
  pullSecondsRemaining,
} from './image-pull'
import { TASK_STATUS_MESSAGE, type TaskStatus } from '../types/task-data'

const TASK_TO_INTERFACE = 'task-1-interface-endpoints'
const INTERFACE_TO_ECR = 'interface-endpoints-ecr'
const TASK_TO_GATEWAY = 'task-1-gateway-endpoint'
const GATEWAY_TO_STORAGE = 'gateway-endpoint-layer-storage'

const LEGS = {
  taskId: 'task-1',
  registryEgressEdgeId: TASK_TO_INTERFACE,
  registryEdgeId: INTERFACE_TO_ECR,
  storageEgressEdgeId: TASK_TO_GATEWAY,
  storageEdgeId: GATEWAY_TO_STORAGE,
  secondsRemaining: 20,
  timeScale: 1,
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

  it('speaks the same request and response language as the rest of the canvas', () => {
    const colours = new Set(buildImagePullItinerary(LEGS, EVERYTHING_UP).map((leg) => leg.color))

    expect(colours).toEqual(new Set(['default']))
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

describe('fitting the trip inside the step it draws', () => {
  it('crosses the whole route in the time left, minus the pauses it takes at each node', () => {
    expect(imagePullSpeed(2000, 10, 0, 1)).toBe(200)
    expect(travelSecondsFor(10, 8, 1)).toBeCloseTo(10 - 8 * 0.22)
  })

  it('leaves room for every dwell, so the trip never outlives the step it draws', () => {
    const legCount = 8
    const secondsRemaining = 10
    const timeScale = 1
    const speed = imagePullSpeed(2000, secondsRemaining, legCount, timeScale)
    const wallClock = 2000 / speed + (legCount * pullDwellMs(timeScale)) / 1000

    expect(wallClock).toBeCloseTo(secondsRemaining)
  })

  it('shrinks the pause with the simulation speed, since a pause is simulated time too', () => {
    expect(pullDwellMs(1)).toBe(220)
    expect(pullDwellMs(25)).toBeCloseTo(8.8)
  })

  it('still has room to travel at high speed, where a fixed pause would eat the whole budget', () => {
    const atTwentyFive = travelSecondsFor(pullSecondsRemaining(0, 12_000, 25), 8, 25)

    expect(atTwentyFive).toBeGreaterThan(0)
  })

  it('shortens the wall clock budget as the simulation speed goes up', () => {
    expect(pullSecondsRemaining(0, 20_000, 1)).toBe(20)
    expect(pullSecondsRemaining(0, 20_000, 25)).toBe(0.8)
  })

  it('runs out of budget once the step is over instead of going negative', () => {
    expect(pullSecondsRemaining(30_000, 20_000, 1)).toBe(0)
  })

  it('gives every leg the speed and the pause the trip was budgeted at', () => {
    const legs = buildImagePullItinerary(LEGS, EVERYTHING_UP, 640, 40)

    expect(new Set(legs.map((leg) => leg.speedPxPerSecond))).toEqual(new Set([640]))
    expect(new Set(legs.map((leg) => leg.dwellMs))).toEqual(new Set([40]))
  })
})

describe('which tasks are pulling', () => {
  const statuses = (...values: TaskStatus[]) => values

  it('counts only the stage whose own label says the image is still coming down', () => {
    expect(isPullingImageStatus('provisioning')).toBe(true)
    expect(TASK_STATUS_MESSAGE.provisioning).toContain('Pulling image')
  })

  it('stops the moment the task reports the image is already pulled', () => {
    expect(isPullingImageStatus('starting')).toBe(false)
    expect(TASK_STATUS_MESSAGE.starting).toContain('Image pulled')
  })

  it('stops counting once the task is waiting on health checks', () => {
    expect(isPullingImageStatus('registering')).toBe(false)
    expect(isPullingImageStatus('healthy')).toBe(false)
  })

  it('never counts a task on its way out', () => {
    expect(isPullingImage(statuses('draining', 'failed'))).toBe(false)
  })

  it('reports a pull while any one task is still fetching, however many are healthy', () => {
    expect(isPullingImage(statuses('healthy', 'healthy', 'provisioning'))).toBe(true)
  })
})
