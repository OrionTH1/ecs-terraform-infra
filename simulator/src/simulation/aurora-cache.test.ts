import { describe, expect, it } from 'vitest'
import {
  CACHE_WARMUP_MS,
  WARM_HIT_RATIO,
  bufferCacheGib,
  cacheHitRatio,
  isCacheWarm,
  servesFromCache,
} from './aurora-cache'
import { AURORA_SERVERLESS } from './simulation-config'

describe('how much the buffer cache can hold', () => {
  it('grows with capacity, which is why scaling up means fewer trips to storage', () => {
    expect(bufferCacheGib(AURORA_SERVERLESS.maxAcu)).toBeGreaterThan(bufferCacheGib(AURORA_SERVERLESS.minAcu))
  })

  it('leaves a quarter of the memory to everything that is not the page cache', () => {
    expect(bufferCacheGib(1)).toBeCloseTo(1.5)
  })
})

describe('an instance whose cache is still filling', () => {
  it('serves nothing from memory the instant it becomes available', () => {
    expect(cacheHitRatio(0)).toBe(0)
  })

  it('reaches its steady ratio once it has been running long enough', () => {
    expect(cacheHitRatio(CACHE_WARMUP_MS)).toBe(WARM_HIT_RATIO)
    expect(cacheHitRatio(CACHE_WARMUP_MS * 10)).toBe(WARM_HIT_RATIO)
  })

  it('warms up gradually rather than switching on', () => {
    expect(cacheHitRatio(CACHE_WARMUP_MS / 2)).toBeCloseTo(WARM_HIT_RATIO / 2)
  })

  it('never reports a hit ratio a cold instance could not have', () => {
    expect(cacheHitRatio(-1)).toBe(0)
  })
})

describe('deciding whether a read touches storage', () => {
  it('sends every read to storage while the cache is empty', () => {
    const outcomes = Array.from({ length: 20 }, (_, rotation) => servesFromCache(rotation, 0))

    expect(outcomes.every((served) => served === false)).toBe(true)
  })

  it('lets one read in a hundred through to storage at the steady ratio', () => {
    const misses = Array.from({ length: 1000 }, (_, rotation) => servesFromCache(rotation, WARM_HIT_RATIO)).filter(
      (served) => !served,
    )

    expect(misses).toHaveLength(10)
  })

  it('spreads the misses out instead of bunching them', () => {
    const firstMiss = Array.from({ length: 200 }, (_, rotation) =>
      servesFromCache(rotation, WARM_HIT_RATIO),
    ).indexOf(false, 1)

    expect(firstMiss).toBe(100)
  })

  it('keeps everything in memory if the cache never missed', () => {
    expect(servesFromCache(7, 1)).toBe(true)
  })
})

describe('reporting the cache as warm', () => {
  it('waits for the steady ratio before calling it warm', () => {
    expect(isCacheWarm(cacheHitRatio(CACHE_WARMUP_MS))).toBe(true)
    expect(isCacheWarm(cacheHitRatio(CACHE_WARMUP_MS / 2))).toBe(false)
  })
})
