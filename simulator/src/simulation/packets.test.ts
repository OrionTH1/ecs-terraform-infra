import { describe, expect, it } from 'vitest'
import { isRouteIntact, PACKET_SPEED_PX_PER_SECOND, type ItineraryLeg } from './packets'
import { divertToWriter } from './request-itinerary'

const ENTRY = 'user-to-alb'
const ALB = 'alb-to-task'
const JUNCTION = 'task-to-junction'
const READER = 'junction-to-reader'
const READER_VOLUME = 'reader-to-volume'
const WRITER = 'junction-to-writer'
const WRITER_VOLUME = 'writer-to-volume'

const REPLICA = { instanceEdgeId: READER, volumeEdgeId: READER_VOLUME }
const PRIMARY = { instanceEdgeId: WRITER, volumeEdgeId: WRITER_VOLUME }

function leg(edgeId: string, reversed = false): ItineraryLeg {
  return { edgeId, reversed, color: 'default', speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND }
}

const READ_ITINERARY = [
  leg(ENTRY),
  leg(ALB),
  leg(JUNCTION),
  leg(READER),
  leg(READER_VOLUME),
  leg(READER_VOLUME, true),
  leg(READER, true),
  leg(JUNCTION, true),
  leg(ALB, true),
  leg(ENTRY, true),
]

const EVERYTHING_UP = new Set([ENTRY, ALB, JUNCTION, READER, READER_VOLUME, WRITER, WRITER_VOLUME])
const REPLICA_DOWN = new Set([ENTRY, ALB, JUNCTION, WRITER, WRITER_VOLUME])

describe('checking whether the road ahead still exists', () => {
  it('accepts a route whose every remaining edge is alive', () => {
    expect(isRouteIntact(READ_ITINERARY, 0, EVERYTHING_UP)).toBe(true)
  })

  it('rejects a route that still has to cross a dead edge', () => {
    expect(isRouteIntact(READ_ITINERARY, 0, REPLICA_DOWN)).toBe(false)
  })

  it('ignores dead edges the packet has already left behind', () => {
    const alreadyPastTheReplica = 8

    expect(isRouteIntact(READ_ITINERARY, alreadyPastTheReplica, REPLICA_DOWN)).toBe(true)
  })
})

describe('a replica lost while requests are in flight', () => {
  it('sends the remaining database legs to the writer instead', () => {
    const diverted = divertToWriter(READ_ITINERARY, 0, REPLICA, PRIMARY)

    expect(isRouteIntact(diverted, 0, REPLICA_DOWN)).toBe(true)
    expect(diverted.map((entry) => entry.edgeId)).toEqual([
      ENTRY, ALB, JUNCTION, WRITER, WRITER_VOLUME, WRITER_VOLUME, WRITER, JUNCTION, ALB, ENTRY,
    ])
  })

  it('leaves the legs already travelled untouched', () => {
    const halfway = 5
    const diverted = divertToWriter(READ_ITINERARY, halfway, REPLICA, PRIMARY)

    expect(diverted.slice(0, halfway)).toEqual(READ_ITINERARY.slice(0, halfway))
  })

  it('keeps each leg pointing the same way it was going', () => {
    const diverted = divertToWriter(READ_ITINERARY, 0, REPLICA, PRIMARY)

    expect(diverted.map((entry) => entry.reversed)).toEqual(READ_ITINERARY.map((entry) => entry.reversed))
  })

  it('does not touch a route that never involved the replica', () => {
    const writeItinerary = [leg(ENTRY), leg(ALB), leg(JUNCTION), leg(WRITER)]

    expect(divertToWriter(writeItinerary, 0, REPLICA, PRIMARY)).toEqual(writeItinerary)
  })
})
