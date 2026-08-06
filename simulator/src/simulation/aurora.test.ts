import { describe, expect, it } from 'vitest'
import {
  RDS_FIRST_INSTANCE_ID,
  RDS_SECOND_INSTANCE_ID,
  isAcceptingTraffic,
  rdsInstanceTerraformAddress,
  routeAuroraTraffic,
  vacantInstanceId,
} from './aurora'
import { BOOT_GRAPH } from './boot-graph'

const READS = 800
const WRITES = 200

const BOTH_UP = { isWriterAvailable: true, isReaderAvailable: true }
const READER_DOWN = { isWriterAvailable: true, isReaderAvailable: false }
const WRITER_DOWN = { isWriterAvailable: false, isReaderAvailable: true }
const BOTH_DOWN = { isWriterAvailable: false, isReaderAvailable: false }

describe('accepting traffic', () => {
  it('only counts an available instance, never one mid-failover', () => {
    expect(isAcceptingTraffic('available')).toBe(true)
    expect(isAcceptingTraffic('promoting')).toBe(false)
    expect(isAcceptingTraffic('provisioning')).toBe(false)
    expect(isAcceptingTraffic('failed')).toBe(false)
    expect(isAcceptingTraffic(undefined)).toBe(false)
  })
})

describe('aurora endpoint routing', () => {
  it('splits reads and writes across both instances in steady state', () => {
    const traffic = routeAuroraTraffic(READS, WRITES, BOTH_UP)

    expect(traffic.readerRequestsPerMinute).toBe(READS)
    expect(traffic.writerRequestsPerMinute).toBe(WRITES)
    expect(traffic.rejectedRequestsPerMinute).toBe(0)
  })

  it('sends every read to the writer while the cluster has no replica', () => {
    const traffic = routeAuroraTraffic(READS, WRITES, READER_DOWN)

    expect(traffic.readerRequestsPerMinute).toBe(0)
    expect(traffic.writerRequestsPerMinute).toBe(READS + WRITES)
    expect(traffic.rejectedRequestsPerMinute).toBe(0)
  })

  it('keeps serving reads from the replica while the writer is gone, and fails the writes', () => {
    const traffic = routeAuroraTraffic(READS, WRITES, WRITER_DOWN)

    expect(traffic.readerRequestsPerMinute).toBe(READS)
    expect(traffic.writerRequestsPerMinute).toBe(0)
    expect(traffic.rejectedRequestsPerMinute).toBe(WRITES)
  })

  it('rejects everything when neither instance can serve', () => {
    const traffic = routeAuroraTraffic(READS, WRITES, BOTH_DOWN)

    expect(traffic.readerRequestsPerMinute).toBe(0)
    expect(traffic.writerRequestsPerMinute).toBe(0)
    expect(traffic.rejectedRequestsPerMinute).toBe(READS + WRITES)
  })

  it('does not count reads that fell back to the writer as committed writes', () => {
    expect(routeAuroraTraffic(READS, WRITES, READER_DOWN).committedWritesPerMinute).toBe(WRITES)
    expect(routeAuroraTraffic(READS, WRITES, WRITER_DOWN).committedWritesPerMinute).toBe(0)
  })
})

describe('instance identity', () => {
  it('hands back the id the other slot is not holding', () => {
    expect(vacantInstanceId({ instanceId: RDS_FIRST_INSTANCE_ID })).toBe(RDS_SECOND_INSTANCE_ID)
    expect(vacantInstanceId({ instanceId: RDS_SECOND_INSTANCE_ID })).toBe(RDS_FIRST_INSTANCE_ID)
  })

  it('starts from the first id when the cluster has no instance left', () => {
    expect(vacantInstanceId(null)).toBe(RDS_FIRST_INSTANCE_ID)
  })

  it('keeps each id pinned to its terraform address regardless of the role it plays', () => {
    expect(rdsInstanceTerraformAddress(RDS_FIRST_INSTANCE_ID)).toBe(BOOT_GRAPH.rdsWriter.terraformAddress)
    expect(rdsInstanceTerraformAddress(RDS_SECOND_INSTANCE_ID)).toBe(BOOT_GRAPH.rdsReader.terraformAddress)
  })
})
