import { PACKET_SPEED_PX_PER_SECOND, type ItineraryLeg } from './packets'
import { RDS_READ_FRACTION, WORKLOAD } from './simulation-config'

export type QueryKind = 'read' | 'write'

export interface DatabaseLegs {
  instanceEdgeId: string
  volumeEdgeId: string
}

export interface ItineraryRequest {
  entryEdgeId: string
  albEdgeId: string
  junctionEdgeId: string | null
  readLegs: DatabaseLegs | null
  writeLegs: DatabaseLegs | null
  queries: QueryKind[]
  liveEdgeIds: Set<string>
}

const WRITES_EVERY = Math.round(1 / (1 - RDS_READ_FRACTION))

export function queriesForNextRequest(rotation: number): QueryKind[] {
  return Array.from({ length: WORKLOAD.queriesPerRequest }, (_, index) =>
    (rotation + index) % WRITES_EVERY === 0 ? 'write' : 'read',
  )
}

function databaseLeg(edgeId: string, reversed: boolean, kind: QueryKind): ItineraryLeg {
  return {
    edgeId,
    reversed,
    color: kind === 'write' ? 'write' : 'default',
    speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND,
  }
}

function transitLeg(edgeId: string, reversed: boolean): ItineraryLeg {
  return { edgeId, reversed, color: 'default', speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND }
}

export function buildRequestItinerary(request: ItineraryRequest): ItineraryLeg[] {
  const { entryEdgeId, albEdgeId, junctionEdgeId, queries, liveEdgeIds } = request

  const inbound = [transitLeg(entryEdgeId, false), transitLeg(albEdgeId, false)]
  const outbound = [transitLeg(albEdgeId, true), transitLeg(entryEdgeId, true)]

  if (junctionEdgeId === null) return [...inbound, ...outbound]

  const roundTrips = queries.flatMap((kind) => {
    const legs = kind === 'write' ? request.writeLegs : request.readLegs
    if (legs === null) return []

    const outward = [databaseLeg(junctionEdgeId, false, kind), databaseLeg(legs.instanceEdgeId, false, kind)]
    const homeward = [databaseLeg(legs.instanceEdgeId, true, kind), databaseLeg(junctionEdgeId, true, kind)]

    if (liveEdgeIds.has(legs.volumeEdgeId)) {
      outward.push(databaseLeg(legs.volumeEdgeId, false, kind))
      homeward.unshift(databaseLeg(legs.volumeEdgeId, true, kind))
    }

    return [...outward, ...homeward]
  })

  return [...inbound, ...roundTrips, ...outbound]
}


export function divertToWriter(
  legs: ItineraryLeg[],
  fromLegIndex: number,
  readLegs: DatabaseLegs,
  writeLegs: DatabaseLegs,
): ItineraryLeg[] {
  return legs.map((leg, index) => {
    if (index < fromLegIndex) return leg
    if (leg.edgeId === readLegs.instanceEdgeId) return { ...leg, edgeId: writeLegs.instanceEdgeId }
    if (leg.edgeId === readLegs.volumeEdgeId) return { ...leg, edgeId: writeLegs.volumeEdgeId }

    return leg
  })
}
