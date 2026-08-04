import { useEffect, useRef, useState } from 'react'
import { ALB_TO_ECS_EDGE_ID } from '../canvas/initial-graph'
import {
  MAX_LIVE_PACKETS,
  MAX_STALL_MS,
  PACKET_SPEED_PX_PER_SECOND,
  packetsPerSecond,
  pathElementId,
  type Packet,
  type RenderedPacket,
} from '../simulation/packets'

const MAX_FRAME_DELTA_SECONDS = 0.1

export interface PacketEntry {
  edgeId: string
  requestsPerMinute: number
}

interface PacketFlowArgs {
  entries: PacketEntry[]
  taskEdgeIds: string[]
}

interface PathGeometry {
  element: SVGPathElement
  length: number
}

type Placement = { kind: 'moving'; x: number; y: number } | { kind: 'stalled' } | { kind: 'arrived' }

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
  let travelled = ((now - packet.startedAt) / 1000) * PACKET_SPEED_PX_PER_SECOND

  for (const edgeId of packet.route) {
    const geometry = readGeometry(edgeId, cache)
    if (!geometry) return { kind: 'stalled' }

    if (travelled <= geometry.length) {
      const point = geometry.element.getPointAtLength(travelled)
      return { kind: 'moving', x: point.x, y: point.y }
    }
    travelled -= geometry.length
  }

  return { kind: 'arrived' }
}

export function usePacketFlow({ entries, taskEdgeIds }: PacketFlowArgs): RenderedPacket[] {
  const [rendered, setRendered] = useState<RenderedPacket[]>([])

  const packets = useRef<Packet[]>([])
  const pending = useRef(new Map<string, number>())
  const nextPacketId = useRef(0)
  const rotation = useRef(0)
  const inputs = useRef<PacketFlowArgs>({ entries, taskEdgeIds })

  inputs.current = { entries, taskEdgeIds }

  useEffect(() => {
    let frameId = 0
    let previous = performance.now()

    function spawn(deltaSeconds: number, now: number) {
      const { entries: currentEntries, taskEdgeIds: currentTaskEdgeIds } = inputs.current
      if (currentTaskEdgeIds.length === 0) return

      const carried = new Map<string, number>()

      for (const entry of currentEntries) {
        const rate = packetsPerSecond(entry.requestsPerMinute)
        let remaining = (pending.current.get(entry.edgeId) ?? 0) + rate * deltaSeconds

        while (remaining >= 1 && packets.current.length < MAX_LIVE_PACKETS) {
          const taskEdgeId = currentTaskEdgeIds[rotation.current % currentTaskEdgeIds.length]
          rotation.current += 1
          packets.current.push({
            id: nextPacketId.current++,
            route: [entry.edgeId, ALB_TO_ECS_EDGE_ID, taskEdgeId],
            startedAt: now,
            stalledSince: null,
            lastPosition: null,
          })
          remaining -= 1
        }

        carried.set(entry.edgeId, rate > 0 ? remaining % 1 : 0)
      }

      pending.current = carried
    }

    function advance(now: number): RenderedPacket[] {
      const cache = new Map<string, PathGeometry | null>()
      const alive: Packet[] = []
      const positions: RenderedPacket[] = []

      for (const packet of packets.current) {
        const placement = locate(packet, now, cache)

        if (placement.kind === 'arrived') continue

        if (placement.kind === 'stalled') {
          const stalledSince = packet.stalledSince ?? now
          if (now - stalledSince > MAX_STALL_MS) continue
          packet.stalledSince = stalledSince
          packet.startedAt += now - previous
          alive.push(packet)
          if (packet.lastPosition) positions.push({ id: packet.id, ...packet.lastPosition })
          continue
        }

        packet.stalledSince = null
        packet.lastPosition = { x: placement.x, y: placement.y }
        alive.push(packet)
        positions.push({ id: packet.id, x: placement.x, y: placement.y })
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
