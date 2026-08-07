export const PACKET_SPEED_PX_PER_SECOND = 190
export const REPLICATION_PACKET_SPEED_PX_PER_SECOND = 400
export const MAX_LIVE_PACKETS = 260
export const MAX_STALL_MS = 600

const MIN_PACKETS_PER_SECOND = 0.8
const MAX_PACKETS_PER_SECOND = 8
const REQUESTS_PER_SECOND_PER_PACKET = 4
const SECONDS_PER_MINUTE = 60

export type PacketColor = 'default' | 'write' | 'blocked'

export interface Packet {
  id: number
  route: string[]
  legColors: PacketColor[]
  speedPxPerSecond: number
  legIndex: number
  legProgress: number
  stalledSince: number | null
  lastPosition: { x: number; y: number } | null
  color: PacketColor
}

export interface RenderedPacket {
  id: number
  x: number
  y: number
  color: PacketColor
}

export function packetsPerSecond(requestsPerMinute: number): number {
  if (requestsPerMinute <= 0) return 0

  const requestsPerSecond = requestsPerMinute / SECONDS_PER_MINUTE
  return Math.min(
    MAX_PACKETS_PER_SECOND,
    Math.max(MIN_PACKETS_PER_SECOND, requestsPerSecond / REQUESTS_PER_SECOND_PER_PACKET),
  )
}

export interface PacketRoute {
  route: string[]
  legColors: PacketColor[]
}

export function repairRoute(
  packet: PacketRoute,
  currentLegIndex: number,
  liveEdgeIds: Set<string>,
  fallbackEdgeIds: string[],
): PacketRoute | null {
  const deadFrom = packet.route.findIndex((edgeId) => !liveEdgeIds.has(edgeId))
  if (deadFrom === -1) return packet
  if (deadFrom <= currentLegIndex) return null

  const [instanceEdgeId, ...rest] = fallbackEdgeIds
  if (instanceEdgeId === undefined || !liveEdgeIds.has(instanceEdgeId)) return null

  const detour = [instanceEdgeId, ...rest.filter((edgeId) => liveEdgeIds.has(edgeId))]
  const carriedColor = packet.legColors[deadFrom] ?? packet.legColors.at(-1) ?? 'default'

  return {
    route: [...packet.route.slice(0, deadFrom), ...detour],
    legColors: [...packet.legColors.slice(0, deadFrom), ...detour.map(() => carriedColor)],
  }
}

export function pathElementId(edgeId: string): string {
  return `flow-path-${edgeId}`
}
