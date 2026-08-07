import { AURORA_SERVERLESS, WORKLOAD } from './simulation-config'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

export function capacityQueriesPerMinute(acu: number): number {
  return acu * AURORA_SERVERLESS.queriesPerSecondPerAcu * SECONDS_PER_MINUTE
}

export function queriesForRequests(requestsPerMinute: number): number {
  return requestsPerMinute * WORKLOAD.queriesPerRequest
}

export function snapToAcuStep(acu: number): number {
  return Math.ceil(acu / AURORA_SERVERLESS.acuStep) * AURORA_SERVERLESS.acuStep
}

export function clampAcu(acu: number): number {
  return Math.min(AURORA_SERVERLESS.maxAcu, Math.max(AURORA_SERVERLESS.minAcu, acu))
}

export function runningFloorAcu(): number {
  return Math.max(AURORA_SERVERLESS.minAcu, AURORA_SERVERLESS.acuStep)
}

export function demandedAcu(queriesPerMinute: number): number {
  if (queriesPerMinute <= 0) return runningFloorAcu()

  const provisionedFor = queriesPerMinute / WORKLOAD.targetAcuUtilization
  return Math.max(runningFloorAcu(), clampAcu(snapToAcuStep(provisionedFor / capacityQueriesPerMinute(1))))
}

export function queryServiceTimeMs(acu: number): number {
  const capacity = capacityQueriesPerMinute(acu)
  if (capacity <= 0) return Infinity

  return (MS_PER_SECOND * SECONDS_PER_MINUTE) / capacity
}

export function requestServiceTimeMs(acu: number): number {
  return queryServiceTimeMs(acu) * WORKLOAD.queriesPerRequest
}

export function advanceAcu(current: number, target: number, deltaMs: number): number {
  if (deltaMs <= 0 || current === target) return current

  const growth = 2 ** (deltaMs / AURORA_SERVERLESS.capacityDoublingMs)
  const floor = Math.max(current, AURORA_SERVERLESS.acuStep)

  return target > current
    ? Math.min(target, floor * growth)
    : Math.max(target, current / growth)
}

export function readerFloorAcu(writerAcu: number, promotionTier: number): number {
  return promotionTier <= 1 ? writerAcu : AURORA_SERVERLESS.minAcu
}

export function isPausable(acu: number, idleMs: number, hasOpenConnections: boolean): boolean {
  if (hasOpenConnections) return false
  if (AURORA_SERVERLESS.minAcu > 0) return false

  return acu > 0 && idleMs >= AURORA_SERVERLESS.secondsUntilAutoPause * MS_PER_SECOND
}
