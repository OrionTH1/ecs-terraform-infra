import { useEffect, useRef, type RefObject } from 'react'
import type { useStoreApi } from '@xyflow/react'
import { SPRITE_SIZE_PX, buildPacketSprites, type PacketShape } from '../canvas/packet-sprites'
import {
  JUNCTION_TO_READER_EDGE_ID,
  JUNCTION_TO_WRITER_EDGE_ID,
  PAGE_CACHE_EDGE_ID,
  READER_TO_VOLUME_EDGE_ID,
} from '../canvas/initial-graph'
import { buildRequestItinerary, divertToWriter, queriesForNextRequest } from '../simulation/request-itinerary'
import {
  MIN_IMAGE_PULL_SECONDS,
  buildImagePullItinerary,
  imagePullSpeed,
  type ImagePullLegs,
} from '../simulation/image-pull'
import type { TaskRoute } from './useTaskGraph'
import {
  MAX_LIVE_PACKETS,
  MAX_STALL_MS,
  PACKET_DWELL_MS,
  PACKET_FADE_MS,
  PACKET_LANE_OFFSET_PX,
  PACKET_SPEED_PX_PER_SECOND,
  REPLICATION_PACKET_SPEED_PX_PER_SECOND,
  isRouteIntact,
  packetsPerSecond,
  pathElementId,
  type ItineraryLeg,
  type Packet,
  type PacketColor,
} from '../simulation/packets'

const MAX_FRAME_DELTA_SECONDS = 0.1

const MAX_PACKET_PIXEL_RATIO = 2

const scratch = { x: 0, y: 0, normalX: 0, normalY: 0 }

const REPLICA_EDGES = {
  instanceEdgeId: JUNCTION_TO_READER_EDGE_ID,
  volumeEdgeId: READER_TO_VOLUME_EDGE_ID,
}

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
  imagePullRoutes: ImagePullLegs[]
  liveEdgeIds: Set<string>
}

interface PacketFlowOptions extends PacketFlowArgs {
  canvas: RefObject<HTMLCanvasElement | null>
  store: ReturnType<typeof useStoreApi>
}

interface DrawnPacket {
  x: number
  y: number
  alpha: number
  color: PacketColor
  shape: PacketShape
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

function pointAtProgress(
  geometry: PathGeometry,
  progress: number,
  into: { x: number; y: number; normalX: number; normalY: number },
) {
  const steps = geometry.samples.length / 2 - 1
  const scaled = Math.min(Math.max(progress, 0), 1) * steps
  const index = Math.min(Math.floor(scaled), steps - 1)
  const fraction = scaled - index

  const x = geometry.samples[index * 2]
  const y = geometry.samples[index * 2 + 1]
  const nextX = geometry.samples[(index + 1) * 2]
  const nextY = geometry.samples[(index + 1) * 2 + 1]

  into.x = x + (nextX - x) * fraction
  into.y = y + (nextY - y) * fraction

  const runX = nextX - x
  const runY = nextY - y
  const span = Math.hypot(runX, runY) || 1
  into.normalX = -runY / span
  into.normalY = runX / span
}

type Placement =
  | { kind: 'moving'; x: number; y: number; legIndex: number; alpha: number }
  | { kind: 'dwelling' }
  | { kind: 'stalled' }
  | { kind: 'arrived' }

function readGeometry(edgeId: string, cache: Map<string, PathGeometry | null>): PathGeometry | null {
  const cached = cache.get(edgeId)
  if (cached !== undefined) return cached

  const element = document.getElementById(pathElementId(edgeId)) as unknown as SVGPathElement | null
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
  now: number,
  deltaSeconds: number,
  cache: Map<string, PathGeometry | null>,
): Placement {
  if (packet.dwellUntil !== null) {
    if (now < packet.dwellUntil) return { kind: 'dwelling' }
    packet.dwellUntil = null
  }

  const leg = packet.legs[packet.legIndex]
  if (!leg) return { kind: 'arrived' }

  const geometry = readGeometry(leg.edgeId, cache)
  if (!geometry) return { kind: 'stalled' }

  const secondsForLeg = geometry.length / leg.speedPxPerSecond
  packet.legProgress += deltaSeconds / secondsForLeg

  if (packet.legProgress >= 1) {
    const heldAtNode = leg.entersNodeAtEnd

    packet.legIndex += 1
    packet.legProgress = 0

    if (packet.legIndex >= packet.legs.length) return { kind: 'arrived' }
    if (!heldAtNode) return advanceAlongRoute(packet, now, 0, cache)

    packet.dwellUntil = now + PACKET_DWELL_MS
    return { kind: 'dwelling' }
  }

  pointAtProgress(geometry, leg.reversed ? 1 - packet.legProgress : packet.legProgress, scratch)

  const lane = leg.reversed ? PACKET_LANE_OFFSET_PX : -PACKET_LANE_OFFSET_PX
  const fadeSeconds = Math.min(PACKET_FADE_MS / 1000, secondsForLeg / 3)
  const secondsOnLeg = packet.legProgress * secondsForLeg
  const leavesNodeAtStart = packet.legs[packet.legIndex - 1]?.entersNodeAtEnd ?? true

  const fadeIn = leavesNodeAtStart ? secondsOnLeg / fadeSeconds : 1
  const fadeOut = leg.entersNodeAtEnd ? (secondsForLeg - secondsOnLeg) / fadeSeconds : 1

  return {
    kind: 'moving',
    x: scratch.x + scratch.normalX * lane,
    y: scratch.y + scratch.normalY * lane,
    legIndex: packet.legIndex,
    alpha: Math.min(1, fadeIn, fadeOut),
  }
}

function justCommittedAWrite(packet: Packet, previousLegIndex: number): boolean {
  for (let index = previousLegIndex; index < Math.min(packet.legIndex, packet.legs.length); index += 1) {
    const leg = packet.legs[index]
    if (leg.edgeId === JUNCTION_TO_WRITER_EDGE_ID && !leg.reversed) return true
  }

  return false
}

export function usePacketFlow({
  entries,
  taskRoutes,
  directEntries,
  imagePullRoutes,
  liveEdgeIds,
  canvas,
  store,
}: PacketFlowOptions) {
  const packets = useRef<Packet[]>([])
  const pending = useRef(new Map<string, number>())
  const nextPacketId = useRef(0)
  const rotation = useRef(0)
  const pullsInFlight = useRef(new Set<string>())
  const writeRotation = useRef(0)
  const inputs = useRef<PacketFlowArgs>({ entries, taskRoutes, directEntries, imagePullRoutes, liveEdgeIds })

  inputs.current = { entries, taskRoutes, directEntries, imagePullRoutes, liveEdgeIds }

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d') ?? null
    if (!element || !context) return

    const sprites = buildPacketSprites()
    const drawnPackets: DrawnPacket[] = Array.from({ length: MAX_LIVE_PACKETS }, () => ({
      x: 0,
      y: 0,
      alpha: 1,
      color: 'default' as PacketColor,
      shape: 'request' as PacketShape,
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

      context!.globalAlpha = 1
      const [offsetX, offsetY, zoom] = store.getState().transform
      const size = SPRITE_SIZE_PX * zoom
      const half = size / 2

      for (let index = 0; index < drawn; index += 1) {
        const packet = drawnPackets[index]
        const screenX = packet.x * zoom + offsetX
        const screenY = packet.y * zoom + offsetY

        if (screenX < -size || screenY < -size || screenX > cssWidth + size || screenY > cssHeight + size) continue

        const sprite = packet.shape === 'response' ? sprites.response : sprites.request[packet.color]
        context!.globalAlpha = packet.alpha
        context!.drawImage(sprite, screenX - half, screenY - half, size, size)
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
      buildLegs: () => ItineraryLeg[],
      carried: Map<string, number>,
    ) {
      spawnAtRate(edgeId, packetsPerSecond(requestsPerMinute), deltaSeconds, color, buildLegs, carried)
    }

    function spawnAtRate(
      edgeId: string,
      rate: number,
      deltaSeconds: number,
      color: PacketColor,
      buildLegs: () => ItineraryLeg[],
      carried: Map<string, number>,
    ) {
      let remaining = (pending.current.get(edgeId) ?? 0) + rate * deltaSeconds

      while (remaining >= 1 && packets.current.length < MAX_LIVE_PACKETS) {
        const legs = buildLegs()
        remaining -= 1
        if (legs.length === 0) continue

        packets.current.push({
          id: nextPacketId.current++,
          routeKey: null,
          legs,
          legIndex: 0,
          legProgress: 0,
          dwellUntil: null,
          stalledSince: null,
          lastPosition: null,
          color,
        })
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

              const queries = queriesForNextRequest(writeRotation.current)
              writeRotation.current += 1

              return buildRequestItinerary({
                entryEdgeId: entry.edgeId,
                albEdgeId: taskRoute.albEdgeId,
                junctionEdgeId: taskRoute.junctionEdgeId,
                readLegs: taskRoute.readLeg,
                writeLegs: taskRoute.writeLeg,
                queries,
                liveEdgeIds: inputs.current.liveEdgeIds,
              })
            },
            carried,
          )
        }
      }

      for (const route of inputs.current.imagePullRoutes) {
        if (pullsInFlight.current.has(route.registryEgressEdgeId)) continue
        if (packets.current.length >= MAX_LIVE_PACKETS) continue

        if (route.secondsRemaining < MIN_IMAGE_PULL_SECONDS) continue

        const geometryCache = new Map<string, PathGeometry | null>()
        const shape = buildImagePullItinerary(route, inputs.current.liveEdgeIds)
        if (shape.length === 0) continue

        const routeLength = shape.reduce(
          (total, entry) => total + (readGeometry(entry.edgeId, geometryCache)?.length ?? 0),
          0,
        )
        if (routeLength === 0) continue

        const legs = buildImagePullItinerary(
          route,
          inputs.current.liveEdgeIds,
          imagePullSpeed(routeLength, route.secondsRemaining),
        )

        pullsInFlight.current.add(route.registryEgressEdgeId)
        packets.current.push({
          id: nextPacketId.current++,
          routeKey: route.registryEgressEdgeId,
          legs,
          legIndex: 0,
          legProgress: 0,
          dwellUntil: null,
          stalledSince: null,
          lastPosition: null,
          color: 'pull',
        })
      }

      for (const entry of currentDirectEntries) {
        spawnAlong(
          entry.edgeId,
          entry.requestsPerMinute,
          deltaSeconds,
          entry.color,
          () => [
            {
              edgeId: entry.edgeId,
              reversed: false,
              color: entry.color,
              speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND,
              entersNodeAtEnd: true,
            },
          ],
          carried,
        )
      }

      pending.current = carried
    }

    function advance(now: number, deltaSeconds: number): number {
      const cache = new Map<string, PathGeometry | null>()
      const alive: Packet[] = []
      let drawn = 0
      const { liveEdgeIds: currentLiveEdgeIds, taskRoutes, imagePullRoutes } = inputs.current
      const writeLegs = taskRoutes[0]?.writeLeg ?? null
      const pullingRouteKeys = new Set(imagePullRoutes.map((route) => route.registryEgressEdgeId))
      const stillPulling = new Set<string>()

      const hasGraphChanged = currentLiveEdgeIds !== routedAgainst
      routedAgainst = currentLiveEdgeIds

      for (const packet of packets.current) {
        if (packet.routeKey !== null && !pullingRouteKeys.has(packet.routeKey)) continue

        if (hasGraphChanged && !isRouteIntact(packet.legs, packet.legIndex, currentLiveEdgeIds)) {
          if (writeLegs === null) continue

          const diverted = divertToWriter(packet.legs, packet.legIndex, REPLICA_EDGES, writeLegs)
          if (!isRouteIntact(diverted, packet.legIndex, currentLiveEdgeIds)) continue

          packet.legs = diverted
        }

        const legBefore = packet.legIndex
        const placement = advanceAlongRoute(packet, now, deltaSeconds, cache)

        if (
          justCommittedAWrite(packet, legBefore) &&
          currentLiveEdgeIds.has(PAGE_CACHE_EDGE_ID) &&
          alive.length < MAX_LIVE_PACKETS
        ) {
          alive.push({
            id: nextPacketId.current++,
            routeKey: null,
            legs: [
              {
                edgeId: PAGE_CACHE_EDGE_ID,
                reversed: false,
                color: 'write',
                speedPxPerSecond: REPLICATION_PACKET_SPEED_PX_PER_SECOND,
                entersNodeAtEnd: true,
              },
            ],
            legIndex: 0,
            legProgress: 0,
            dwellUntil: null,
            stalledSince: null,
            lastPosition: null,
            color: 'write',
          })
        }

        if (placement.kind === 'arrived') continue

        if (placement.kind === 'dwelling') {
          packet.stalledSince = null
          alive.push(packet)
          if (packet.routeKey !== null) stillPulling.add(packet.routeKey)
          continue
        }

        if (placement.kind === 'stalled') {
          const stalledSince = packet.stalledSince ?? now
          if (now - stalledSince > MAX_STALL_MS) continue
          packet.stalledSince = stalledSince
          alive.push(packet)
          if (packet.routeKey !== null) stillPulling.add(packet.routeKey)
          const held = packet.lastPosition
          if (held) {
            const entry = drawnPackets[drawn]
            entry.x = held.x
            entry.y = held.y
            entry.alpha = 1
            entry.color = packet.color
            entry.shape = packet.legs[packet.legIndex]?.reversed ? 'response' : 'request'
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
        if (packet.routeKey !== null) stillPulling.add(packet.routeKey)

        const entry = drawnPackets[drawn]
        entry.x = placement.x
        entry.y = placement.y
        entry.alpha = placement.alpha
        entry.color = packet.legs[placement.legIndex]?.color ?? packet.color
        entry.shape = packet.legs[placement.legIndex]?.reversed ? 'response' : 'request'
        drawn += 1
      }

      packets.current = alive
      pullsInFlight.current = stillPulling
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
