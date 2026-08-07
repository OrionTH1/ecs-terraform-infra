import { beforeEach, describe, expect, it } from 'vitest'
import { useSimulationStore } from './useSimulationStore'
import { BOOT_CRITICAL_PATH_MS } from '../simulation/boot-graph'
import { runningFloorAcu } from '../simulation/aurora-capacity'
import {
  AURORA_FAILOVER_MS,
  AURORA_SERVERLESS,
  COLD_START_MS,
  RDS_INSTANCE_FAILED_LINGER_MS,
  WAF_RATE_LIMIT_PER_MINUTE,
} from '../simulation/simulation-config'

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

function slots() {
  return useSimulationStore.getState().rdsSlots
}

beforeEach(() => {
  useSimulationStore.setState(useSimulationStore.getInitialState(), true)
  useSimulationStore.getState().setTimeScale(BOOT_TIME_SCALE)
  advance(BOOT_CRITICAL_PATH_MS + COLD_START_MS + 60_000)
  useSimulationStore.getState().setTimeScale(LOAD_TIME_SCALE)
})

describe('capacity at rest', () => {
  it('holds both instances at the smallest live capacity while idle', () => {
    advance(10 * 60_000)

    expect(slots().writer?.acu).toBe(runningFloorAcu())
    expect(slots().reader?.acu).toBe(runningFloorAcu())
  })
})

describe('capacity under load', () => {
  it('scales the reader first, since it takes the read share of the traffic', () => {
    drive(6000)
    advance(10 * 60_000)

    expect(slots().reader?.acu ?? 0).toBeGreaterThan(runningFloorAcu())
    expect(slots().writer?.acu).toBe(runningFloorAcu())
  })

  it('pulls the writer up too once the write share alone needs more capacity', () => {
    drive(10_000)
    advance(20 * 60_000)

    expect(slots().writer?.acu ?? 0).toBeGreaterThan(runningFloorAcu())
  })

  it('never exceeds the ceiling the cluster is configured with', () => {
    drive(40_000)
    advance(30 * 60_000)

    expect(slots().writer?.acu ?? 0).toBeLessThanOrEqual(AURORA_SERVERLESS.maxAcu)
    expect(slots().reader?.acu ?? 0).toBeLessThanOrEqual(AURORA_SERVERLESS.maxAcu)
  })

  it('releases capacity again once the load goes away', () => {
    drive(10_000)
    advance(20 * 60_000)
    const underLoad = slots().writer?.acu ?? 0

    drive(0)
    advance(20 * 60_000)

    expect(slots().writer?.acu ?? 0).toBeLessThan(underLoad)
  })
})

describe('capacity across a promotion', () => {
  it('carries the replica capacity into the writer slot instead of restarting from the floor', () => {
    drive(10_000)
    advance(20 * 60_000)
    const replicaAcu = slots().reader?.acu ?? 0

    expect(replicaAcu).toBeGreaterThan(runningFloorAcu())

    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().writer?.lifecycle).toBe('promoting')
    expect(slots().writer?.acu ?? 0).toBeGreaterThanOrEqual(replicaAcu)
  })

  it('keeps that capacity through the failover window, so writes resume at full size', () => {
    drive(10_000)
    advance(20 * 60_000)
    const replicaAcu = slots().reader?.acu ?? 0

    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + AURORA_FAILOVER_MS + 5_000)

    expect(slots().writer?.lifecycle).toBe('available')
    expect(slots().writer?.acu ?? 0).toBeGreaterThanOrEqual(replicaAcu)
  })
})

describe('promotion tier 0 ties the reader to the writer', () => {
  it('never lets the standby fall below the writer capacity, even serving nothing', () => {
    drive(10_000)
    advance(20 * 60_000)

    expect(slots().reader?.acu ?? 0).toBeGreaterThanOrEqual(slots().writer?.acu ?? 0)
  })
})
