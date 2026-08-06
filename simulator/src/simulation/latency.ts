import { LATENCY } from './simulation-config'

const MS_PER_MINUTE = 60_000

export function stageCapacityPerMinute(serviceTimeMs: number): number {
  return MS_PER_MINUTE / serviceTimeMs
}

export function stageUtilization(requestsPerMinute: number, serviceTimeMs: number): number {
  return Math.max(0, requestsPerMinute) / stageCapacityPerMinute(serviceTimeMs)
}

export function stageResponseTimeMs(serviceTimeMs: number, requestsPerMinute: number): number {
  const utilization = Math.min(stageUtilization(requestsPerMinute, serviceTimeMs), LATENCY.maxUtilization)
  return serviceTimeMs / (1 - utilization)
}

export function percentileMs(meanResponseTimeMs: number, percentile: number): number {
  return meanResponseTimeMs * -Math.log(1 - percentile)
}

export function p50Ms(meanResponseTimeMs: number): number {
  return percentileMs(meanResponseTimeMs, 0.5)
}

export function p99Ms(meanResponseTimeMs: number): number {
  return percentileMs(meanResponseTimeMs, 0.99)
}

export interface LatencyLoad {
  requestsPerMinutePerTask: number
  writerRequestsPerMinute: number
  readerRequestsPerMinute: number
}

export interface LatencyBreakdown {
  taskMs: number
  writerMs: number
  readerMs: number
  databaseMs: number
  totalMs: number
}

export function computeLatency(load: LatencyLoad): LatencyBreakdown {
  const taskMs = stageResponseTimeMs(LATENCY.appServiceTimeMs, load.requestsPerMinutePerTask)
  const writerMs = stageResponseTimeMs(LATENCY.dbServiceTimeMs, load.writerRequestsPerMinute)
  const readerMs = stageResponseTimeMs(LATENCY.dbServiceTimeMs, load.readerRequestsPerMinute)

  const servedRequests = load.writerRequestsPerMinute + load.readerRequestsPerMinute
  const databaseMs =
    servedRequests > 0
      ? (load.writerRequestsPerMinute * writerMs + load.readerRequestsPerMinute * readerMs) / servedRequests
      : 0

  return { taskMs, writerMs, readerMs, databaseMs, totalMs: taskMs + databaseMs }
}

export const IDLE_LATENCY = computeLatency({
  requestsPerMinutePerTask: 0,
  writerRequestsPerMinute: 0,
  readerRequestsPerMinute: 0,
})

export function smoothLatency(
  previous: LatencyBreakdown,
  target: LatencyBreakdown,
  deltaMs: number,
): LatencyBreakdown {
  const weight = 1 - Math.exp(-Math.max(deltaMs, 0) / LATENCY.smoothingTimeConstantMs)
  const blend = (from: number, to: number) => from + (to - from) * weight

  const taskMs = blend(previous.taskMs, target.taskMs)
  const databaseMs = blend(previous.databaseMs, target.databaseMs)

  return {
    taskMs,
    writerMs: blend(previous.writerMs, target.writerMs),
    readerMs: blend(previous.readerMs, target.readerMs),
    databaseMs,
    totalMs: taskMs + databaseMs,
  }
}

export function appendLatencySample(history: number[], sampleMs: number): number[] {
  return [...history, sampleMs].slice(-LATENCY.historyLength)
}
