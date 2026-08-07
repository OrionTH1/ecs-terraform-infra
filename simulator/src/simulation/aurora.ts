import { BOOT_GRAPH } from './boot-graph'
import type { RdsInstanceLifecycle } from '../types/node-data'

export const RDS_FIRST_INSTANCE_ID = 1
export const RDS_SECOND_INSTANCE_ID = 2

export function rdsInstanceTerraformAddress(instanceId: number): string {
  return instanceId === RDS_FIRST_INSTANCE_ID
    ? BOOT_GRAPH.rdsWriter.terraformAddress
    : BOOT_GRAPH.rdsReader.terraformAddress
}

export function vacantInstanceId(occupant: { instanceId: number } | null): number {
  return occupant?.instanceId === RDS_FIRST_INSTANCE_ID ? RDS_SECOND_INSTANCE_ID : RDS_FIRST_INSTANCE_ID
}

export function isAcceptingTraffic(lifecycle: RdsInstanceLifecycle | undefined): boolean {
  return lifecycle === 'available'
}

export interface AuroraAvailability {
  isWriterAvailable: boolean
  isReaderAvailable: boolean
}

export interface AuroraEndpointTraffic {
  writerRequestsPerMinute: number
  readerRequestsPerMinute: number
  committedWritesPerMinute: number
  rejectedRequestsPerMinute: number
}

export function needsWriterPromotion(
  writerLifecycle: RdsInstanceLifecycle | undefined,
  readerLifecycle: RdsInstanceLifecycle | undefined,
): boolean {
  return readerLifecycle === 'available' && writerLifecycle === 'provisioning'
}

export function isAbsorbingFallbackReads(
  reads: number,
  { isWriterAvailable, isReaderAvailable }: AuroraAvailability,
): boolean {
  return isWriterAvailable && !isReaderAvailable && reads > 0
}

export function routeAuroraTraffic(
  reads: number,
  writes: number,
  { isWriterAvailable, isReaderAvailable }: AuroraAvailability,
): AuroraEndpointTraffic {
  const readsServedByReader = isReaderAvailable ? reads : 0
  const readsFallingBackToWriter = reads - readsServedByReader
  const writerLoad = writes + readsFallingBackToWriter

  return {
    writerRequestsPerMinute: isWriterAvailable ? writerLoad : 0,
    readerRequestsPerMinute: readsServedByReader,
    committedWritesPerMinute: isWriterAvailable ? writes : 0,
    rejectedRequestsPerMinute: isWriterAvailable ? 0 : writerLoad,
  }
}
