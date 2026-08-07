import { beforeEach, describe, expect, it } from 'vitest'
import { useSimulationStore } from './useSimulationStore'
import { RDS_FIRST_INSTANCE_ID, RDS_SECOND_INSTANCE_ID } from '../simulation/aurora'
import { BOOT_CRITICAL_PATH_MS, BOOT_GRAPH } from '../simulation/boot-graph'
import {
  AURORA_FAILOVER_MS,
  AURORA_REBUILD_WRITER_MS,
  RDS_INSTANCE_FAILED_LINGER_MS,
} from '../simulation/simulation-config'

const TICK_REAL_MS = 16
const BOOT_TIME_SCALE = 600
const FAILOVER_TIME_SCALE = 10

function advance(simMs: number) {
  const target = useSimulationStore.getState().clock + simMs
  while (useSimulationStore.getState().clock < target) {
    useSimulationStore.getState().tick(TICK_REAL_MS)
  }
}

function slots() {
  return useSimulationStore.getState().rdsSlots
}

function instanceIds() {
  const { writer, reader } = slots()
  return [writer?.instanceId, reader?.instanceId].filter((id) => id !== undefined).sort()
}

function settleFailover() {
  advance(RDS_INSTANCE_FAILED_LINGER_MS + AURORA_FAILOVER_MS + 5_000)
}

function settleRebuild() {
  advance(BOOT_GRAPH.rdsReader.durationMs + 60_000)
}

beforeEach(() => {
  useSimulationStore.setState(useSimulationStore.getInitialState(), true)
  useSimulationStore.getState().setTimeScale(BOOT_TIME_SCALE)
  advance(BOOT_CRITICAL_PATH_MS + 60_000)
  useSimulationStore.getState().setTimeScale(FAILOVER_TIME_SCALE)
})

describe('aurora cluster at rest', () => {
  it('finishes the apply with one writer and one reader, both serving', () => {
    expect(slots().writer).toMatchObject({ instanceId: RDS_FIRST_INSTANCE_ID, lifecycle: 'available' })
    expect(slots().reader).toMatchObject({ instanceId: RDS_SECOND_INSTANCE_ID, lifecycle: 'available' })
  })
})

describe('writer failure', () => {
  it('marks the instance failed before anything is promoted', () => {
    useSimulationStore.getState().killRdsInstance('writer')

    expect(slots().writer).toMatchObject({ instanceId: RDS_FIRST_INSTANCE_ID, lifecycle: 'failed' })
    expect(slots().reader).toMatchObject({ instanceId: RDS_SECOND_INSTANCE_ID, lifecycle: 'available' })
  })

  it('promotes the replica, carrying its instance id into the writer slot', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().writer).toMatchObject({ instanceId: RDS_SECOND_INSTANCE_ID, lifecycle: 'promoting' })
  })

  it('rebuilds the replica on the id the promoted instance vacated', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().reader).toMatchObject({ instanceId: RDS_FIRST_INSTANCE_ID, lifecycle: 'provisioning' })
  })

  it('leaves the cluster without a writer for the whole failover window', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + AURORA_FAILOVER_MS - 5_000)

    expect(slots().writer?.lifecycle).not.toBe('available')
  })

  it('brings the promoted writer back once the failover window closes', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    settleFailover()

    expect(slots().writer).toMatchObject({ instanceId: RDS_SECOND_INSTANCE_ID, lifecycle: 'available' })
    expect(slots().reader?.lifecycle).toBe('provisioning')
  })

  it('ends with both instances serving again, still on the original pair of ids', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    settleFailover()
    settleRebuild()

    expect(slots().writer).toMatchObject({ instanceId: RDS_SECOND_INSTANCE_ID, lifecycle: 'available' })
    expect(slots().reader).toMatchObject({ instanceId: RDS_FIRST_INSTANCE_ID, lifecycle: 'available' })
  })
})

describe('reader failure', () => {
  it('rebuilds the replica without touching the writer', () => {
    useSimulationStore.getState().killRdsInstance('reader')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().writer).toMatchObject({ instanceId: RDS_FIRST_INSTANCE_ID, lifecycle: 'available' })
    expect(slots().reader).toMatchObject({ instanceId: RDS_SECOND_INSTANCE_ID, lifecycle: 'provisioning' })
  })
})

describe('failure with no replica to promote', () => {
  it('rebuilds a writer instead of promoting when the replica is still provisioning', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().writer?.lifecycle).toBe('provisioning')
    expect(instanceIds()).toEqual([RDS_FIRST_INSTANCE_ID, RDS_SECOND_INSTANCE_ID])
  })

  it('rebuilds both instances when the whole cluster is destroyed', () => {
    useSimulationStore.getState().killRdsInstance('writer')
    useSimulationStore.getState().killRdsInstance('reader')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().writer?.lifecycle).toBe('provisioning')
    expect(slots().reader?.lifecycle).toBe('provisioning')
    expect(instanceIds()).toEqual([RDS_FIRST_INSTANCE_ID, RDS_SECOND_INSTANCE_ID])
  })
})

describe('losing both instances while the replica is still being rebuilt', () => {
  it('promotes the replica the moment it is ready, instead of waiting out the writer rebuild', () => {
    useSimulationStore.getState().killRdsInstance('reader')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    expect(slots().writer?.lifecycle).toBe('provisioning')
    expect(slots().reader?.lifecycle).toBe('provisioning')

    advance(BOOT_GRAPH.rdsReader.durationMs)

    expect(slots().writer?.lifecycle).toBe('promoting')
  })

  it('hands the writer role to the instance that finished first', () => {
    useSimulationStore.getState().killRdsInstance('reader')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)
    const rebuildingReplicaId = slots().reader?.instanceId

    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000 + BOOT_GRAPH.rdsReader.durationMs)

    expect(slots().writer?.instanceId).toBe(rebuildingReplicaId)
  })

  it('keeps the half-built primary as the replica rather than restarting it', () => {
    useSimulationStore.getState().killRdsInstance('reader')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)
    const rebuildingPrimaryId = slots().writer?.instanceId

    advance(BOOT_GRAPH.rdsReader.durationMs)

    expect(slots().reader?.instanceId).toBe(rebuildingPrimaryId)
    expect(instanceIds()).toEqual([RDS_FIRST_INSTANCE_ID, RDS_SECOND_INSTANCE_ID])
  })

  it('ends with both instances serving, without a third one ever existing', () => {
    useSimulationStore.getState().killRdsInstance('reader')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)
    useSimulationStore.getState().killRdsInstance('writer')
    advance(RDS_INSTANCE_FAILED_LINGER_MS + 2_000)

    advance(BOOT_GRAPH.rdsReader.durationMs + AURORA_FAILOVER_MS + AURORA_REBUILD_WRITER_MS)

    expect(slots().writer?.lifecycle).toBe('available')
    expect(slots().reader?.lifecycle).toBe('available')
    expect(instanceIds()).toEqual([RDS_FIRST_INSTANCE_ID, RDS_SECOND_INSTANCE_ID])
  })
})

describe('repeated failures', () => {
  it('never mints a third instance, no matter how many times the writer is destroyed', () => {
    for (let round = 0; round < 5; round += 1) {
      useSimulationStore.getState().killRdsInstance('writer')
      settleFailover()
      settleRebuild()

      expect(instanceIds()).toEqual([RDS_FIRST_INSTANCE_ID, RDS_SECOND_INSTANCE_ID])
    }
  })
})
