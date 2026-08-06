import { describe, expect, it } from 'vitest'
import {
  appendLatencySample,
  computeLatency,
  p50Ms,
  p99Ms,
  smoothLatency,
  stageResponseTimeMs,
  stageUtilization,
} from './latency'
import { AUTOSCALING, LATENCY, TASK_CAPACITY_PER_MINUTE } from './simulation-config'

const IDLE_LOAD = {
  requestsPerMinutePerTask: 0,
  writerRequestsPerMinute: 0,
  readerRequestsPerMinute: 0,
}

describe('queueing model', () => {
  it('charges only the service time when nothing is queued', () => {
    expect(stageResponseTimeMs(LATENCY.appServiceTimeMs, 0)).toBe(LATENCY.appServiceTimeMs)
  })

  it('doubles the response time at half the capacity of the stage', () => {
    const halfCapacity = TASK_CAPACITY_PER_MINUTE / 2

    expect(stageResponseTimeMs(LATENCY.appServiceTimeMs, halfCapacity)).toBeCloseTo(LATENCY.appServiceTimeMs * 2)
  })

  it('keeps the autoscaling target inside the flat part of the curve', () => {
    const utilization = stageUtilization(AUTOSCALING.targetRequestsPerMinutePerTask, LATENCY.appServiceTimeMs)

    expect(utilization).toBeLessThan(0.5)
  })

  it('caps a saturated stage instead of dividing by zero', () => {
    const saturated = stageResponseTimeMs(LATENCY.appServiceTimeMs, TASK_CAPACITY_PER_MINUTE * 10)

    expect(Number.isFinite(saturated)).toBe(true)
    expect(saturated).toBe(LATENCY.appServiceTimeMs / (1 - LATENCY.maxUtilization))
  })
})

describe('percentiles', () => {
  it('places the median below the mean, as an exponential distribution does', () => {
    expect(p50Ms(100)).toBeCloseTo(69.3, 1)
  })

  it('stretches the tail well past the mean', () => {
    expect(p99Ms(100)).toBeCloseTo(460.5, 1)
  })
})

describe('end-to-end latency', () => {
  it('bottoms out at the sum of the service times when nothing is being served', () => {
    expect(computeLatency(IDLE_LOAD).totalMs).toBe(LATENCY.appServiceTimeMs)
  })

  it('adds the task queue and the database queue', () => {
    const latency = computeLatency({
      requestsPerMinutePerTask: 1000,
      writerRequestsPerMinute: 400,
      readerRequestsPerMinute: 1600,
    })

    expect(latency.totalMs).toBeCloseTo(latency.taskMs + latency.databaseMs)
  })

  it('climbs when the same traffic is spread over fewer tasks', () => {
    const spread = computeLatency({
      requestsPerMinutePerTask: 1000,
      writerRequestsPerMinute: 800,
      readerRequestsPerMinute: 3200,
    })
    const concentrated = computeLatency({
      requestsPerMinutePerTask: 2000,
      writerRequestsPerMinute: 800,
      readerRequestsPerMinute: 3200,
    })

    expect(concentrated.totalMs).toBeGreaterThan(spread.totalMs * 1.5)
  })

  it('punishes the writer once the reader stops absorbing the reads', () => {
    const withReplica = computeLatency({
      requestsPerMinutePerTask: 2000,
      writerRequestsPerMinute: 1600,
      readerRequestsPerMinute: 6400,
    })
    const writerOnly = computeLatency({
      requestsPerMinutePerTask: 2000,
      writerRequestsPerMinute: 8000,
      readerRequestsPerMinute: 0,
    })

    expect(writerOnly.databaseMs).toBeGreaterThan(withReplica.databaseMs)
  })

  it('ignores an idle instance when averaging what requests actually waited for', () => {
    const readerDown = computeLatency({
      requestsPerMinutePerTask: 1000,
      writerRequestsPerMinute: 2000,
      readerRequestsPerMinute: 0,
    })

    expect(readerDown.databaseMs).toBe(readerDown.writerMs)
  })
})

describe('smoothing', () => {
  it('moves towards the target instead of snapping to it', () => {
    const smoothed = smoothLatency(computeLatency(IDLE_LOAD), computeLatency({ ...IDLE_LOAD, requestsPerMinutePerTask: 2000 }), 1000)

    expect(smoothed.taskMs).toBeGreaterThan(LATENCY.appServiceTimeMs)
    expect(smoothed.taskMs).toBeLessThan(computeLatency({ ...IDLE_LOAD, requestsPerMinutePerTask: 2000 }).taskMs)
  })

  it('converges on the target once enough time has passed', () => {
    const target = computeLatency({ ...IDLE_LOAD, requestsPerMinutePerTask: 2000 })
    let latency = computeLatency(IDLE_LOAD)

    for (let step = 0; step < 200; step += 1) latency = smoothLatency(latency, target, 1000)

    expect(latency.totalMs).toBeCloseTo(target.totalMs, 3)
  })

  it('keeps the total equal to its parts through the smoothing', () => {
    const smoothed = smoothLatency(
      computeLatency(IDLE_LOAD),
      computeLatency({ requestsPerMinutePerTask: 2000, writerRequestsPerMinute: 800, readerRequestsPerMinute: 3200 }),
      4000,
    )

    expect(smoothed.totalMs).toBeCloseTo(smoothed.taskMs + smoothed.databaseMs)
  })
})

describe('history', () => {
  it('drops the oldest sample once the window is full', () => {
    let history: number[] = []
    for (let sample = 0; sample < LATENCY.historyLength + 10; sample += 1) {
      history = appendLatencySample(history, sample)
    }

    expect(history).toHaveLength(LATENCY.historyLength)
    expect(history[0]).toBe(10)
  })
})
