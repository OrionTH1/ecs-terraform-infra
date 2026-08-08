export const SHARED_BUFFERS_FRACTION = 0.75
export const GIB_PER_ACU = 2
export const WARM_HIT_RATIO = 0.99
export const CACHE_WARMUP_MS = 90_000

export function bufferCacheGib(acu: number): number {
  return acu * GIB_PER_ACU * SHARED_BUFFERS_FRACTION
}

export function cacheHitRatio(msSinceAvailable: number): number {
  if (msSinceAvailable <= 0) return 0

  return WARM_HIT_RATIO * Math.min(1, msSinceAvailable / CACHE_WARMUP_MS)
}

export function servesFromCache(rotation: number, hitRatio: number): boolean {
  if (hitRatio <= 0) return false
  if (hitRatio >= 1) return true

  return rotation % Math.round(1 / (1 - hitRatio)) !== 0
}

export function isCacheWarm(hitRatio: number): boolean {
  return hitRatio >= WARM_HIT_RATIO
}
