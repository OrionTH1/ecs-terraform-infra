import { describe, expect, it } from 'vitest'
import {
  advanceAcu,
  capacityQueriesPerMinute,
  clampAcu,
  demandedAcu,
  isPausable,
  readerFloorAcu,
  queryServiceTimeMs,
  queriesForRequests,
  requestServiceTimeMs,
  snapToAcuStep,
} from './aurora-capacity'
import { AURORA_SERVERLESS, WORKLOAD } from './simulation-config'

const AWS_PUBLISHED_FULL_RANGE_MS = 22 * 60_000
const AWS_PUBLISHED_FLOOR_ACU = 0.5
const AWS_PUBLISHED_CEILING_ACU = 256

describe('capacity derived from the AWS sysbench benchmark', () => {
  it('scales throughput linearly with capacity', () => {
    expect(capacityQueriesPerMinute(1)).toBe(AURORA_SERVERLESS.queriesPerSecondPerAcu * 60)
    expect(capacityQueriesPerMinute(4)).toBe(capacityQueriesPerMinute(1) * 4)
  })

  it('serves nothing while paused', () => {
    expect(capacityQueriesPerMinute(0)).toBe(0)
    expect(queryServiceTimeMs(0)).toBe(Infinity)
  })

  it('shortens the service time as capacity grows', () => {
    expect(queryServiceTimeMs(4)).toBeCloseTo(queryServiceTimeMs(1) / 4)
  })
})

describe('demanded capacity', () => {
  it('rounds up to the half-ACU step Aurora actually scales in', () => {
    expect(snapToAcuStep(0.1)).toBe(0.5)
    expect(snapToAcuStep(1.2)).toBe(1.5)
  })

  it('asks for no capacity when nothing is arriving', () => {
    expect(demandedAcu(0)).toBe(AURORA_SERVERLESS.minAcu)
  })

  it('provisions above the arriving load, leaving the assumed headroom', () => {
    const arriving = capacityQueriesPerMinute(1)
    const provisioned = demandedAcu(arriving)

    expect(provisioned).toBeGreaterThan(1)
    expect(arriving / capacityQueriesPerMinute(provisioned)).toBeLessThanOrEqual(WORKLOAD.targetAcuUtilization)
  })

  it('never asks for more than the configured ceiling', () => {
    expect(demandedAcu(capacityQueriesPerMinute(1000))).toBe(AURORA_SERVERLESS.maxAcu)
    expect(clampAcu(99)).toBe(AURORA_SERVERLESS.maxAcu)
  })

  it('leaves a step of headroom below the ceiling at the ECS peak', () => {
    const atEcsCeiling = demandedAcu(queriesForRequests(10_000))

    expect(atEcsCeiling).toBeLessThan(AURORA_SERVERLESS.maxAcu)
  })

  it('pins to the ceiling when the tasks run away past their target', () => {
    const saturatedTasks = 10 * 2500

    expect(demandedAcu(queriesForRequests(saturatedTasks))).toBe(AURORA_SERVERLESS.maxAcu)
  })

  it('charges a request for every query it issues', () => {
    expect(queriesForRequests(100)).toBe(100 * WORKLOAD.queriesPerRequest)
    expect(requestServiceTimeMs(2)).toBeCloseTo(queryServiceTimeMs(2) * WORKLOAD.queriesPerRequest)
  })
})

describe('proportional scaling rate', () => {
  it('reproduces the AWS figure of 0.5 to 256 ACUs in 22 minutes', () => {
    const doublings = AWS_PUBLISHED_FULL_RANGE_MS / AURORA_SERVERLESS.capacityDoublingMs
    const reached = AWS_PUBLISHED_FLOOR_ACU * 2 ** doublings

    expect(reached / AWS_PUBLISHED_CEILING_ACU).toBeGreaterThan(0.97)
  })

  it('doubles capacity over one doubling interval', () => {
    expect(advanceAcu(1, 4, AURORA_SERVERLESS.capacityDoublingMs)).toBe(2)
  })

  it('adds bigger increments from a bigger starting capacity', () => {
    const fromSmall = advanceAcu(0.5, 4, 30_000) - 0.5
    const fromLarge = advanceAcu(2, 4, 30_000) - 2

    expect(fromLarge).toBeGreaterThan(fromSmall)
  })

  it('stops exactly at the target instead of overshooting', () => {
    expect(advanceAcu(2, 3, AURORA_SERVERLESS.capacityDoublingMs)).toBe(3)
  })

  it('releases capacity at the same proportional rate', () => {
    expect(advanceAcu(4, 1, AURORA_SERVERLESS.capacityDoublingMs)).toBe(2)
  })

  it('does not move when it is already at the target', () => {
    expect(advanceAcu(2, 2, 60_000)).toBe(2)
  })
})

describe('reader tied to the writer by promotion tier', () => {
  it('floors a tier 0 reader at the current writer capacity', () => {
    expect(readerFloorAcu(2.5, 0)).toBe(2.5)
    expect(readerFloorAcu(2.5, 1)).toBe(2.5)
  })

  it('lets a tier 2 or higher reader scale independently', () => {
    expect(readerFloorAcu(2.5, 2)).toBe(AURORA_SERVERLESS.minAcu)
  })

  it('uses the tier this repo actually provisions', () => {
    expect(readerFloorAcu(3, AURORA_SERVERLESS.promotionTier)).toBe(3)
  })
})

describe('auto-pause', () => {
  const idleLongEnough = AURORA_SERVERLESS.secondsUntilAutoPause * 1000

  it('pauses an idle instance once the configured interval elapses', () => {
    expect(isPausable(0.5, idleLongEnough, false)).toBe(true)
  })

  it('never pauses while a connection is held open', () => {
    expect(isPausable(0.5, idleLongEnough, true)).toBe(false)
  })

  it('does not pause before the interval elapses', () => {
    expect(isPausable(0.5, idleLongEnough - 1, false)).toBe(false)
  })

  it('does not pause an instance that is already at zero', () => {
    expect(isPausable(0, idleLongEnough, false)).toBe(false)
  })
})
