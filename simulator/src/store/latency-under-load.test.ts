import { beforeEach, describe, expect, it } from 'vitest'
import { useSimulationStore } from './useSimulationStore'
import { BOOT_CRITICAL_PATH_MS } from '../simulation/boot-graph'
import { p50Ms } from '../simulation/latency'
import { AUTOSCALING, COLD_START_MS, LATENCY, WAF_RATE_LIMIT_PER_MINUTE } from '../simulation/simulation-config'

const TICK_REAL_MS = 16
const BOOT_TIME_SCALE = 600
const LOAD_TIME_SCALE = 10

const SAFE_FRACTION_OF_RATE_LIMIT = 0.85

function advance(simMs: number) {
  const target = useSimulationStore.getState().clock + simMs
  while (useSimulationStore.getState().clock < target) {
    useSimulationStore.getState().tick(TICK_REAL_MS)
  }
}

function drive(requestsPerMinute: number) {
  const ipCount = Math.ceil(requestsPerMinute / (WAF_RATE_LIMIT_PER_MINUTE * SAFE_FRACTION_OF_RATE_LIMIT))

  useSimulationStore.getState().setSourceRates(
    Array.from({ length: ipCount }, (_, index) => ({
      ip: `192.0.2.${index + 1}`,
      requestsPerMinute: requestsPerMinute / ipCount,
    })),
  )
}

function latency() {
  return useSimulationStore.getState().latency
}

function healthyTaskCount() {
  return useSimulationStore.getState().tasks.filter((task) => task.status === 'healthy').length
}

beforeEach(() => {
  useSimulationStore.setState(useSimulationStore.getInitialState(), true)
  useSimulationStore.getState().setTimeScale(BOOT_TIME_SCALE)
  advance(BOOT_CRITICAL_PATH_MS + COLD_START_MS + 60_000)
  useSimulationStore.getState().setTimeScale(LOAD_TIME_SCALE)
})

describe('latency at rest', () => {
  it('settles near the floor once the service is idle and healthy', () => {
    advance(5 * 60_000)

    expect(healthyTaskCount()).toBe(AUTOSCALING.minCapacity)
    expect(p50Ms(latency().totalMs)).toBeLessThan(30)
  })
})

describe('latency during the scale-out gap', () => {
  it('climbs while the same traffic keeps landing on the tasks already running', () => {
    drive(AUTOSCALING.targetRequestsPerMinutePerTask * AUTOSCALING.minCapacity)
    advance(3 * 60_000)
    const atTarget = latency().totalMs

    drive(AUTOSCALING.targetRequestsPerMinutePerTask * AUTOSCALING.maxCapacity)
    advance(60_000)

    expect(healthyTaskCount()).toBe(AUTOSCALING.minCapacity)
    expect(latency().totalMs).toBeGreaterThan(atTarget)
  })

  it('falls back once the extra tasks finish their cold start and take a share', () => {
    drive(AUTOSCALING.targetRequestsPerMinutePerTask * AUTOSCALING.maxCapacity)
    advance(AUTOSCALING.scaleOutEvaluationMs + 30_000)
    const duringGap = latency().totalMs

    advance(COLD_START_MS + 5 * 60_000)

    expect(healthyTaskCount()).toBeGreaterThan(AUTOSCALING.minCapacity)
    expect(latency().totalMs).toBeLessThan(duringGap)
  })
})

describe('latency when the replica is lost', () => {
  it('rises because every read falls back onto the writer', () => {
    drive(AUTOSCALING.targetRequestsPerMinutePerTask * AUTOSCALING.maxCapacity)
    advance(AUTOSCALING.scaleOutEvaluationMs + COLD_START_MS + 5 * 60_000)
    const withReplica = latency().databaseMs

    useSimulationStore.getState().killRdsInstance('reader')
    advance(60_000)

    expect(latency().databaseMs).toBeGreaterThan(withReplica)
  })
})

describe('latency history', () => {
  it('records samples as the clock advances, capped at the window length', () => {
    advance(LATENCY.historySampleMs * (LATENCY.historyLength + 20))

    expect(useSimulationStore.getState().latencyHistory).toHaveLength(LATENCY.historyLength)
  })
})
