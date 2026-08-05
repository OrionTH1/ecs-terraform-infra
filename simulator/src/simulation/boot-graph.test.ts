import { describe, expect, it } from 'vitest'
import {
  BOOT_CRITICAL_PATH_MS,
  RESOURCE_IDS,
  advanceResourceLedger,
  createResourceLedger,
  resourceCompletionMs,
  type ResourceLedger,
} from './boot-graph'

function runUntil(endMs: number, stepMs: number): ResourceLedger {
  let ledger = createResourceLedger()

  for (let now = 0; now <= endMs; now += stepMs) {
    ledger = advanceResourceLedger(ledger, now)
  }

  return ledger
}

function completionTimes(ledger: ResourceLedger): Record<string, number | null> {
  return Object.fromEntries(RESOURCE_IDS.map((id) => [id, ledger[id].createdAt]))
}

describe('boot graph', () => {
  it('starts every dependency-free resource at once, the way terraform apply does', () => {
    const ledger = advanceResourceLedger(createResourceLedger(), 0)

    expect(ledger.alb.status).toBe('creating')
    expect(ledger.targetGroup.status).toBe('creating')
    expect(ledger.wafWebAcl.status).toBe('creating')
    expect(ledger.rdsCluster.status).toBe('creating')

    expect(ledger.wafAssociation.status).toBe('pending')
    expect(ledger.ecsService.status).toBe('pending')
    expect(ledger.rdsWriter.status).toBe('pending')
  })

  it('finishes the web acl long before the alb, then waits on the alb to associate it', () => {
    const beforeAlb = runUntil(60_000, 1000)

    expect(beforeAlb.wafWebAcl.status).toBe('created')
    expect(beforeAlb.alb.status).toBe('creating')
    expect(beforeAlb.wafAssociation.status).toBe('pending')

    const afterAlb = runUntil(3 * 60_000, 1000)

    expect(afterAlb.alb.status).toBe('created')
    expect(afterAlb.wafAssociation.status).toBe('creating')
    expect(afterAlb.wafAssociation.startedAt).toBe(afterAlb.alb.createdAt)
  })

  it('brings the service up on the cluster endpoint while the instances are still creating', () => {
    const ledger = runUntil(5 * 60_000, 1000)

    expect(ledger.ecsService.status).toBe('created')
    expect(ledger.rdsWriter.status).toBe('creating')
    expect(ledger.rdsReader.status).toBe('creating')
  })

  it('gates the service on the alb, which lands after the cluster', () => {
    expect(resourceCompletionMs('rdsCluster')).toBeLessThan(resourceCompletionMs('alb'))
    expect(resourceCompletionMs('ecsService')).toBe(resourceCompletionMs('alb') + 60_000)
  })

  it('creates both aurora instances in parallel off the same cluster', () => {
    const ledger = runUntil(10 * 60_000, 1000)

    expect(ledger.rdsWriter.startedAt).toBe(ledger.rdsCluster.createdAt)
    expect(ledger.rdsReader.startedAt).toBe(ledger.rdsCluster.createdAt)
    expect(ledger.rdsWriter.createdAt).toBeLessThan(ledger.rdsReader.createdAt ?? 0)
  })

  it('reports identical timings no matter how coarse the tick is', () => {
    const fine = runUntil(15 * 60_000, 250)
    const coarse = runUntil(15 * 60_000, 7_000)

    expect(completionTimes(coarse)).toEqual(completionTimes(fine))
  })

  it('ends the apply on the reader instance', () => {
    const ledger = runUntil(15 * 60_000, 1000)

    expect(BOOT_CRITICAL_PATH_MS).toBe(9 * 60_000)
    expect(ledger.rdsReader.createdAt).toBe(BOOT_CRITICAL_PATH_MS)
    expect(RESOURCE_IDS.every((id) => ledger[id].status === 'created')).toBe(true)
  })
})
