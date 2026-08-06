import { useEffect, useRef, useState } from 'react'
import { PAGE_CACHE_EDGE_ID } from '../canvas/initial-graph'
import { RDS_READ_FRACTION } from '../simulation/simulation-config'
import type { TaskRoute } from './useTaskGraph'
import {
  MAX_LIVE_PACKETS,
  MAX_STALL_MS,
  PACKET_SPEED_PX_PER_SECOND,
  REPLICATION_PACKET_SPEED_PX_PER_SECOND,
  packetsPerSecond,
  pathElementId,
  type Packet,
  type PacketColor,
  type RenderedPacket,
} from '../simulation/packets'

const MAX_FRAME_DELTA_SECONDS = 0.1

export interface PacketEntry {
  edgeId: string
  requestsPerMinute: number
}

export interface DirectPacketEntry {
  edgeId: string
  requestsPerMinute: number
  color: PacketColor
}

interface PacketFlowArgs {
  entries: PacketEntry[]
  taskRoutes: TaskRoute[]
  directEntries: DirectPacketEntry[]
  liveEdgeIds: Set<string>
}

const WRITES_EVERY = Math.round(1 / (1 - RDS_READ_FRACTION))

function isCommittedWrite(packet: Packet): boolean {
  return packet.route.at(-1) !== PAGE_CACHE_EDGE_ID && packet.legColors.at(-1) === 'write'
}

interface PathGeometry {
  element: SVGPathElement
  length: number
}

type Placement =
  | { kind: 'moving'; x: number; y: number; legIndex: number }
  | { kind: 'stalled' }
  | { kind: 'arrived' }

function readGeometry(edgeId: string, cache: Map<string, PathGeometry | null>): PathGeometry | null {
  const cached = cache.get(edgeId)
  if (cached !== undefined) return cached

  const element = document.getElementById(pathElementId(edgeId)) as SVGPathElement | null
  const length = element?.getTotalLength() ?? 0
  const geometry = element && length > 0 ? { element, length } : null
  cache.set(edgeId, geometry)
  return geometry
}

function locate(packet: Packet, now: number, cache: Map<string, PathGeometry | null>): Placement {
  let travelled = ((now - packet.startedAt) / 1000) * packet.speedPxPerSecond

  for (const [legIndex, edgeId] of packet.route.entries()) {
    const geometry = readGeometry(edgeId, cache)
    if (!geometry) return { kind: 'stalled' }

    if (travelled <= geometry.length) {
      const point = geometry.element.getPointAtLength(travelled)
      return { kind: 'moving', x: point.x, y: point.y, legIndex }
    }
    travelled -= geometry.length
  }

  return { kind: 'arrived' }
}

export function usePacketFlow({ entries, taskRoutes, directEntries, liveEdgeIds }: PacketFlowArgs): RenderedPacket[] {
  const [rendered, setRendered] = useState<RenderedPacket[]>([])

  const packets = useRef<Packet[]>([])
  const pending = useRef(new Map<string, number>())
  const nextPacketId = useRef(0)
  const rotation = useRef(0)
  const writeRotation = useRef(0)
  const inputs = useRef<PacketFlowArgs>({ entries, taskRoutes, directEntries, liveEdgeIds })

  inputs.current = { entries, taskRoutes, directEntries, liveEdgeIds }

  useEffect(() => {
    let frameId = 0
    let previous = performance.now()

    function spawnAlong(
      edgeId: string,
      requestsPerMinute: number,
      deltaSeconds: number,
      now: number,
      color: PacketColor,
      buildRoute: () => { route: string[]; legColors: PacketColor[] },
      carried: Map<string, number>,
    ) {
      const rate = packetsPerSecond(requestsPerMinute)
      let remaining = (pending.current.get(edgeId) ?? 0) + rate * deltaSeconds

      while (remaining >= 1 && packets.current.length < MAX_LIVE_PACKETS) {
        packets.current.push({
          id: nextPacketId.current++,
          ...buildRoute(),
          speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND,
          startedAt: now,
          stalledSince: null,
          lastPosition: null,
          color,
        })
        remaining -= 1
      }

      carried.set(edgeId, rate > 0 ? remaining % 1 : 0)
    }

    function spawn(deltaSeconds: number, now: number) {
      const { entries: currentEntries, taskRoutes, directEntries: currentDirectEntries } = inputs.current
      const carried = new Map<string, number>()

      if (taskRoutes.length > 0) {
        for (const entry of currentEntries) {
          spawnAlong(
            entry.edgeId,
            entry.requestsPerMinute,
            deltaSeconds,
            now,
            'default',
            () => {
              const taskRoute = taskRoutes[rotation.current % taskRoutes.length]
              rotation.current += 1

              const isWrite = writeRotation.current % WRITES_EVERY === 0
              writeRotation.current += 1

              const databaseLeg = isWrite ? taskRoute.writeLeg : taskRoute.readLeg
              if (taskRoute.junctionEdgeId === null || databaseLeg === null) {
                return { route: [entry.edgeId, taskRoute.albEdgeId], legColors: ['default', 'default'] }
              }

              const databaseColor: PacketColor = isWrite ? 'write' : 'default'
              const route = [entry.edgeId, taskRoute.albEdgeId, taskRoute.junctionEdgeId, databaseLeg.instanceEdgeId]
              const legColors: PacketColor[] = ['default', 'default', 'default', databaseColor]

              if (inputs.current.liveEdgeIds.has(databaseLeg.volumeEdgeId)) {
                route.push(databaseLeg.volumeEdgeId)
                legColors.push(databaseColor)
              }

              return { route, legColors }
            },
            carried,
          )
        }
      }

      for (const entry of currentDirectEntries) {
        spawnAlong(
          entry.edgeId,
          entry.requestsPerMinute,
          deltaSeconds,
          now,
          entry.color,
          () => ({ route: [entry.edgeId], legColors: [entry.color] }),
          carried,
        )
      }

      pending.current = carried
    }

    function advance(now: number): RenderedPacket[] {
      const cache = new Map<string, PathGeometry | null>()
      const alive: Packet[] = []
      const positions: RenderedPacket[] = []
      const { liveEdgeIds: currentLiveEdgeIds } = inputs.current

      for (const packet of packets.current) {
        const isRouteIntact = packet.route.every((edgeId) => currentLiveEdgeIds.has(edgeId))
        if (!isRouteIntact) continue

        const placement = locate(packet, now, cache)

        if (placement.kind === 'arrived') {
          if (isCommittedWrite(packet) && currentLiveEdgeIds.has(PAGE_CACHE_EDGE_ID) && alive.length < MAX_LIVE_PACKETS) {
            alive.push({
              id: nextPacketId.current++,
              route: [PAGE_CACHE_EDGE_ID],
              legColors: ['write'],
              speedPxPerSecond: REPLICATION_PACKET_SPEED_PX_PER_SECOND,
              startedAt: now,
              stalledSince: null,
              lastPosition: null,
              color: 'write',
            })
          }
          continue
        }

        if (placement.kind === 'stalled') {
          const stalledSince = packet.stalledSince ?? now
          if (now - stalledSince > MAX_STALL_MS) continue
          packet.stalledSince = stalledSince
          packet.startedAt += now - previous
          alive.push(packet)
          if (packet.lastPosition) positions.push({ id: packet.id, ...packet.lastPosition, color: packet.color })
          continue
        }

        packet.stalledSince = null
        packet.lastPosition = { x: placement.x, y: placement.y }
        alive.push(packet)
        positions.push({
          id: packet.id,
          x: placement.x,
          y: placement.y,
          color: packet.legColors[placement.legIndex] ?? packet.color,
        })
      }

      packets.current = alive
      return positions
    }

    function step(now: number) {
      const deltaSeconds = Math.min((now - previous) / 1000, MAX_FRAME_DELTA_SECONDS)

      spawn(deltaSeconds, now)
      setRendered(advance(now))

      previous = now
      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return rendered
}
