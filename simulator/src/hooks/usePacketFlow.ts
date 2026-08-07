import { useEffect, useRef, type RefObject } from 'react'
import type { useStoreApi } from '@xyflow/react'
import { SPRITE_SIZE_PX, buildPacketSprites } from '../canvas/packet-sprites'
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
  repairRoute,
  type Packet,
  type PacketColor,
} from '../simulation/packets'

const MAX_FRAME_DELTA_SECONDS = 0.1

const MAX_PACKET_PIXEL_RATIO = 2

const scratch = { x: 0, y: 0 }

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

interface PacketFlowOptions extends PacketFlowArgs {
  canvas: RefObject<HTMLCanvasElement | null>
  store: ReturnType<typeof useStoreApi>
}

interface DrawnPacket {
  x: number
  y: number
  color: PacketColor
}

interface RouteBuild {
  route: string[]
  legColors: PacketColor[]
}

const WRITES_EVERY = Math.round(1 / (1 - RDS_READ_FRACTION))

function isCommittedWrite(packet: Packet): boolean {
  return packet.route.at(-1) !== PAGE_CACHE_EDGE_ID && packet.legColors.at(-1) === 'write'
}

const SAMPLE_SPACING_PX = 16

interface PathGeometry {
  length: number
  samples: Float64Array
}

const sampledPaths = new Map<string, { shape: string; geometry: PathGeometry }>()

function samplePath(element: SVGPathElement, length: number): PathGeometry {
  const steps = Math.max(2, Math.ceil(length / SAMPLE_SPACING_PX))
  const samples = new Float64Array((steps + 1) * 2)

  for (let step = 0; step <= steps; step += 1) {
    const point = element.getPointAtLength((step / steps) * length)
    samples[step * 2] = point.x
    samples[step * 2 + 1] = point.y
  }

  return { length, samples }
}

function pointAtProgress(geometry: PathGeometry, progress: number, into: { x: number; y: number }) {
  const steps = geometry.samples.length / 2 - 1
  const scaled = Math.min(Math.max(progress, 0), 1) * steps
  const index = Math.min(Math.floor(scaled), steps - 1)
  const fraction = scaled - index

  const x = geometry.samples[index * 2]
  const y = geometry.samples[index * 2 + 1]
  into.x = x + (geometry.samples[(index + 1) * 2] - x) * fraction
  into.y = y + (geometry.samples[(index + 1) * 2 + 1] - y) * fraction
}

type Placement =
  | { kind: 'moving'; x: number; y: number; legIndex: number }
  | { kind: 'stalled' }
  | { kind: 'arrived' }

function readGeometry(edgeId: string, cache: Map<string, PathGeometry | null>): PathGeometry | null {
  const cached = cache.get(edgeId)
  if (cached !== undefined) return cached

  const element = document.getElementById(pathElementId(edgeId)) as SVGPathElement | null
  const shape = element?.getAttribute('d') ?? ''

  let geometry: PathGeometry | null = null
  if (element && shape !== '') {
    const remembered = sampledPaths.get(edgeId)
    if (remembered && remembered.shape === shape) {
      geometry = remembered.geometry
    } else {
      const length = element.getTotalLength()
      if (length > 0) {
        geometry = samplePath(element, length)
        sampledPaths.set(edgeId, { shape, geometry })
      }
    }
  }

  cache.set(edgeId, geometry)
  return geometry
}

function advanceAlongRoute(
  packet: Packet,
  deltaSeconds: number,
  cache: Map<string, PathGeometry | null>,
): Placement {
  let remaining = packet.speedPxPerSecond * deltaSeconds

  while (packet.legIndex < packet.route.length) {
    const geometry = readGeometry(packet.route[packet.legIndex], cache)
    if (!geometry) return { kind: 'stalled' }

    const distanceLeft = (1 - packet.legProgress) * geometry.length
    if (remaining < distanceLeft) {
      packet.legProgress += remaining / geometry.length
      pointAtProgress(geometry, packet.legProgress, scratch)
      return { kind: 'moving', x: scratch.x, y: scratch.y, legIndex: packet.legIndex }
    }

    remaining -= distanceLeft
    packet.legIndex += 1
    packet.legProgress = 0
  }

  return { kind: 'arrived' }
}

export function usePacketFlow({ entries, taskRoutes, directEntries, liveEdgeIds, canvas, store }: PacketFlowOptions) {
  const packets = useRef<Packet[]>([])
  const pending = useRef(new Map<string, number>())
  const nextPacketId = useRef(0)
  const rotation = useRef(0)
  const writeRotation = useRef(0)
  const inputs = useRef<PacketFlowArgs>({ entries, taskRoutes, directEntries, liveEdgeIds })

  inputs.current = { entries, taskRoutes, directEntries, liveEdgeIds }

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d') ?? null
    if (!element || !context) return

    const sprites = buildPacketSprites()
    const drawnPackets: DrawnPacket[] = Array.from({ length: MAX_LIVE_PACKETS }, () => ({
      x: 0,
      y: 0,
      color: 'default' as PacketColor,
    }))

    let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PACKET_PIXEL_RATIO)
    let cssWidth = 0
    let cssHeight = 0

    function resize() {
      pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PACKET_PIXEL_RATIO)
      cssWidth = element!.clientWidth
      cssHeight = element!.clientHeight
      element!.width = Math.round(cssWidth * pixelRatio)
      element!.height = Math.round(cssHeight * pixelRatio)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)

    function draw(drawn: number) {
      context!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context!.clearRect(0, 0, cssWidth, cssHeight)

      const [offsetX, offsetY, zoom] = store.getState().transform
      const size = SPRITE_SIZE_PX * zoom
      const half = size / 2

      for (let index = 0; index < drawn; index += 1) {
        const packet = drawnPackets[index]
        const screenX = packet.x * zoom + offsetX
        const screenY = packet.y * zoom + offsetY

        if (screenX < -size || screenY < -size || screenX > cssWidth + size || screenY > cssHeight + size) continue

        context!.drawImage(sprites[packet.color], screenX - half, screenY - half, size, size)
      }
    }

    let frameId = 0
    let previous = performance.now()
    let routedAgainst: Set<string> | null = null

    function spawnAlong(
      edgeId: string,
      requestsPerMinute: number,
      deltaSeconds: number,
      color: PacketColor,
      buildRoute: () => RouteBuild,
      carried: Map<string, number>,
    ) {
      const rate = packetsPerSecond(requestsPerMinute)
      let remaining = (pending.current.get(edgeId) ?? 0) + rate * deltaSeconds

      while (remaining >= 1 && packets.current.length < MAX_LIVE_PACKETS) {
        packets.current.push({
          id: nextPacketId.current++,
          ...buildRoute(),
          speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND,
          legIndex: 0,
          legProgress: 0,
          stalledSince: null,
          lastPosition: null,
          color,
        })
        remaining -= 1
      }

      carried.set(edgeId, rate > 0 ? remaining % 1 : 0)
    }

    function spawn(deltaSeconds: number) {
      const { entries: currentEntries, taskRoutes, directEntries: currentDirectEntries } = inputs.current
      const carried = new Map<string, number>()

      if (taskRoutes.length > 0) {
        for (const entry of currentEntries) {
          spawnAlong(
            entry.edgeId,
            entry.requestsPerMinute,
            deltaSeconds,
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
          entry.color,
          () => ({ route: [entry.edgeId], legColors: [entry.color] }),
          carried,
        )
      }

      pending.current = carried
    }

    function advance(now: number, deltaSeconds: number): number {
      const cache = new Map<string, PathGeometry | null>()
      const alive: Packet[] = []
      let drawn = 0
      const { liveEdgeIds: currentLiveEdgeIds, taskRoutes } = inputs.current
      const writeLeg = taskRoutes[0]?.writeLeg ?? null
      const fallbackEdgeIds = writeLeg ? [writeLeg.instanceEdgeId, writeLeg.volumeEdgeId] : []

      const hasGraphChanged = currentLiveEdgeIds !== routedAgainst
      routedAgainst = currentLiveEdgeIds

      for (const packet of packets.current) {
        if (hasGraphChanged) {
          const repaired = repairRoute(packet, packet.legIndex, currentLiveEdgeIds, fallbackEdgeIds)
          if (repaired === null) continue
          packet.route = repaired.route
          packet.legColors = repaired.legColors
        }

        const placement = advanceAlongRoute(packet, deltaSeconds, cache)

        if (placement.kind === 'arrived') {
          if (isCommittedWrite(packet) && currentLiveEdgeIds.has(PAGE_CACHE_EDGE_ID) && alive.length < MAX_LIVE_PACKETS) {
            alive.push({
              id: nextPacketId.current++,
              route: [PAGE_CACHE_EDGE_ID],
              legColors: ['write'],
              speedPxPerSecond: REPLICATION_PACKET_SPEED_PX_PER_SECOND,
              legIndex: 0,
              legProgress: 0,
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
          alive.push(packet)
          const held = packet.lastPosition
          if (held) {
            const entry = drawnPackets[drawn]
            entry.x = held.x
            entry.y = held.y
            entry.color = packet.color
            drawn += 1
          }
          continue
        }

        packet.stalledSince = null
        if (packet.lastPosition === null) packet.lastPosition = { x: placement.x, y: placement.y }
        else {
          packet.lastPosition.x = placement.x
          packet.lastPosition.y = placement.y
        }
        alive.push(packet)

        const entry = drawnPackets[drawn]
        entry.x = placement.x
        entry.y = placement.y
        entry.color = packet.legColors[placement.legIndex] ?? packet.color
        drawn += 1
      }

      packets.current = alive
      return drawn
    }

    function step(now: number) {
      const deltaSeconds = Math.min((now - previous) / 1000, MAX_FRAME_DELTA_SECONDS)

      spawn(deltaSeconds)
      draw(advance(now, deltaSeconds))

      previous = now
      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [canvas, store])
}
