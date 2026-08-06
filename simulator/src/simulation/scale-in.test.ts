import { describe, expect, it } from 'vitest'
import { selectDrainIndexes } from './scale-in'

describe('scale-in target selection', () => {
  it('drains the newest healthy tasks down to the target', () => {
    expect(selectDrainIndexes(['healthy', 'healthy', 'healthy', 'healthy'], 2)).toEqual([2, 3])
  })

  it('drains nothing when the running count already sits at the target', () => {
    expect(selectDrainIndexes(['healthy', 'healthy', 'healthy'], 3)).toEqual([])
  })

  it('drains nothing when a killed task already dropped the service below the target', () => {
    expect(selectDrainIndexes(['healthy', 'healthy', 'failed'], 3)).toEqual([])
  })

  it('counts tasks the scheduler is still launching towards the running total', () => {
    expect(selectDrainIndexes(['healthy', 'healthy', 'provisioning'], 2)).toEqual([1])
  })

  it('never drains a task that is not serving traffic yet', () => {
    expect(selectDrainIndexes(['provisioning', 'starting', 'registering'], 1)).toEqual([])
  })

  it('ignores tasks already draining when measuring the excess', () => {
    expect(selectDrainIndexes(['healthy', 'healthy', 'draining'], 2)).toEqual([])
  })
})
