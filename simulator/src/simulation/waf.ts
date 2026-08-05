import { WAF, WAF_BUCKET_COUNT } from './simulation-config'

const MS_PER_MINUTE = 60_000

export interface WafSourceState {
  buckets: number[]
  bucketStartedAt: number
  lastEvaluatedAt: number
  isBlocked: boolean
  blockedRequests: number
}

export function createWafSource(now: number): WafSourceState {
  return {
    buckets: new Array(WAF_BUCKET_COUNT).fill(0),
    bucketStartedAt: now,
    lastEvaluatedAt: now,
    isBlocked: false,
    blockedRequests: 0,
  }
}

export function windowRequestCount(state: WafSourceState): number {
  return state.buckets.reduce((sum, count) => sum + count, 0)
}

export function advanceWafSource(
  state: WafSourceState,
  requestsPerMinute: number,
  deltaMs: number,
  now: number,
): WafSourceState {
  const requests = Math.max(0, requestsPerMinute) * (deltaMs / MS_PER_MINUTE)

  let buckets = state.buckets
  if (requests > 0) {
    buckets = [...buckets]
    buckets[buckets.length - 1] += requests
  }

  let bucketStartedAt = state.bucketStartedAt
  const rotations = Math.floor((now - bucketStartedAt) / WAF.bucketMs)
  if (rotations > 0) {
    const dropped = Math.min(rotations, WAF_BUCKET_COUNT)
    buckets = [...buckets.slice(dropped), ...new Array(dropped).fill(0)]
    bucketStartedAt += rotations * WAF.bucketMs
  }

  let isBlocked = state.isBlocked
  let lastEvaluatedAt = state.lastEvaluatedAt
  if (now - lastEvaluatedAt >= WAF.evaluationIntervalMs) {
    lastEvaluatedAt = now
    isBlocked = Math.round(buckets.reduce((sum, count) => sum + count, 0)) > WAF.rateLimitPer5Min
  }

  return {
    buckets,
    bucketStartedAt,
    lastEvaluatedAt,
    isBlocked,
    blockedRequests: state.blockedRequests + (state.isBlocked ? requests : 0),
  }
}
