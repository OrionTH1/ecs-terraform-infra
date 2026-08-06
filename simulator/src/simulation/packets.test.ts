import { describe, expect, it } from 'vitest'
import { PACKET_SPEED_PX_PER_SECOND, packetSpeedPxPerSecond } from './packets'
import { computeLatency } from './latency'
import { LATENCY, TASK_CAPACITY_PER_MINUTE } from './simulation-config'

const IDLE_LOAD = {
  requestsPerMinutePerTask: 0,
  writerRequestsPerMinute: 0,
  readerRequestsPerMinute: 0,
}

function taskLatencyAt(requestsPerMinutePerTask: number): number {
  return computeLatency({ ...IDLE_LOAD, requestsPerMinutePerTask }).taskMs
}

describe('packet speed', () => {
  it('runs at full speed on a stage that is not queueing', () => {
    expect(packetSpeedPxPerSecond(taskLatencyAt(0), LATENCY.appServiceTimeMs)).toBe(PACKET_SPEED_PX_PER_SECOND)
  })

  it('never speeds a packet up past the base speed', () => {
    expect(packetSpeedPxPerSecond(1, LATENCY.appServiceTimeMs)).toBe(PACKET_SPEED_PX_PER_SECOND)
  })

  it('slows down as the stage fills up', () => {
    const light = packetSpeedPxPerSecond(taskLatencyAt(TASK_CAPACITY_PER_MINUTE * 0.4), LATENCY.appServiceTimeMs)
    const heavy = packetSpeedPxPerSecond(taskLatencyAt(TASK_CAPACITY_PER_MINUTE * 0.9), LATENCY.appServiceTimeMs)

    expect(heavy).toBeLessThan(light)
    expect(light).toBeLessThan(PACKET_SPEED_PX_PER_SECOND)
  })

  it('keeps a saturated stage crawling rather than frozen', () => {
    const saturated = packetSpeedPxPerSecond(taskLatencyAt(TASK_CAPACITY_PER_MINUTE * 10), LATENCY.appServiceTimeMs)

    expect(saturated).toBeGreaterThan(0)
    expect(saturated).toBeLessThan(PACKET_SPEED_PX_PER_SECOND * 0.3)
  })

  it('reads congestion per stage, so the same latency means different things to task and database', () => {
    const atTaskStage = packetSpeedPxPerSecond(48, LATENCY.appServiceTimeMs)
    const atDatabaseStage = packetSpeedPxPerSecond(48, LATENCY.dbServiceTimeMs)

    expect(atDatabaseStage).toBeLessThan(atTaskStage)
  })
})
