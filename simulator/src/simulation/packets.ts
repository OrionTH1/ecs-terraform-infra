export const PACKET_SPEED_PX_PER_SECOND = 190
export const MAX_LIVE_PACKETS = 90
export const MAX_STALL_MS = 600

const MIN_PACKETS_PER_SECOND = 0.8
const MAX_PACKETS_PER_SECOND = 8
const REQUESTS_PER_SECOND_PER_PACKET = 4
const SECONDS_PER_MINUTE = 60

export interface Packet {
  id: number
  route: string[]
  startedAt: number
  stalledSince: number | null
  lastPosition: { x: number; y: number } | null
}

export interface RenderedPacket {
  id: number
  x: number
  y: number
}

export function packetsPerSecond(requestsPerMinute: number): number {
  if (requestsPerMinute <= 0) return 0

  const requestsPerSecond = requestsPerMinute / SECONDS_PER_MINUTE
  return Math.min(
    MAX_PACKETS_PER_SECOND,
    Math.max(MIN_PACKETS_PER_SECOND, requestsPerSecond / REQUESTS_PER_SECOND_PER_PACKET),
  )
}

export function pathElementId(edgeId: string): string {
  return `flow-path-${edgeId}`
}
