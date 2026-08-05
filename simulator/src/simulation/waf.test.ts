import { describe, expect, it } from 'vitest'
import { WAF, WAF_RATE_LIMIT_PER_MINUTE } from './simulation-config'
import { advanceWafSource, createWafSource, windowRequestCount, type WafSourceState } from './waf'

const STEP_MS = 1000

interface Run {
  state: WafSourceState
  now: number
}

function advance({ state, now }: Run, requestsPerMinute: number, durationMs: number): Run {
  const end = now + durationMs
  let current = state
  let clock = now

  while (clock < end) {
    clock += STEP_MS
    current = advanceWafSource(current, requestsPerMinute, STEP_MS, clock)
  }

  return { state: current, now: clock }
}

function start(): Run {
  return { state: createWafSource(0), now: 0 }
}

describe('rate-based rule', () => {
  it('never blocks a source sitting exactly on the limit', () => {
    const { state } = advance(start(), WAF_RATE_LIMIT_PER_MINUTE, 10 * 60_000)

    expect(state.isBlocked).toBe(false)
    expect(state.blockedRequests).toBe(0)
  })

  it('blocks a source well over the limit at the first evaluation', () => {
    const before = advance(start(), 5000, WAF.evaluationIntervalMs - STEP_MS)
    expect(before.state.isBlocked).toBe(false)

    const after = advance(before, 5000, STEP_MS)
    expect(after.state.isBlocked).toBe(true)
  })

  it('keeps counting requests it blocks, so a source cannot outlast the rule by insisting', () => {
    const blocked = advance(start(), 5000, 2 * 60_000)

    expect(blocked.state.isBlocked).toBe(true)
    expect(windowRequestCount(blocked.state)).toBeGreaterThan(WAF.rateLimitPer5Min)
    expect(blocked.state.blockedRequests).toBeGreaterThan(0)
  })

  it('does not unblock the moment the rate drops — the window has to drain first', () => {
    const blocked = advance(start(), 5000, 60_000)
    expect(blocked.state.isBlocked).toBe(true)

    const justAfter = advance(blocked, 0, 60_000)
    expect(justAfter.state.isBlocked).toBe(true)

    const drained = advance(justAfter, 0, WAF.windowMs)
    expect(drained.state.isBlocked).toBe(false)
    expect(windowRequestCount(drained.state)).toBe(0)
  })

  it('gives a freshly drawn IP a clean window while the abandoned one stays blocked', () => {
    const abandoned = advance(start(), 5000, 60_000)
    expect(abandoned.state.isBlocked).toBe(true)

    const rotated = advance({ state: createWafSource(abandoned.now), now: abandoned.now }, 5000, STEP_MS)
    expect(rotated.state.isBlocked).toBe(false)

    const stillBlocked = advance({ ...abandoned, now: rotated.now }, 0, 60_000)
    expect(stillBlocked.state.isBlocked).toBe(true)

    const caughtUp = advance(rotated, 5000, WAF.evaluationIntervalMs)
    expect(caughtUp.state.isBlocked).toBe(true)
  })

  it('stops attributing blocked requests once the source is allowed again', () => {
    const drained = advance(advance(start(), 5000, 60_000), 0, WAF.windowMs + 60_000)
    const settled = advance(drained, WAF_RATE_LIMIT_PER_MINUTE, 60_000)

    expect(settled.state.isBlocked).toBe(false)
    expect(settled.state.blockedRequests).toBe(drained.state.blockedRequests)
  })
})
