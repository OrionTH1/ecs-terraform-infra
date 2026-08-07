import { describe, expect, it } from 'vitest'
import { buildRequestItinerary, queriesForNextRequest, type QueryKind } from './request-itinerary'
import { PACKET_SPEED_PX_PER_SECOND } from './packets'
import { WORKLOAD } from './simulation-config'

const ENTRY = 'user-to-alb'
const ALB = 'alb-to-task'
const JUNCTION = 'task-to-junction'
const READER = 'junction-to-reader'
const READER_VOLUME = 'reader-to-volume'
const WRITER = 'junction-to-writer'
const WRITER_VOLUME = 'writer-to-volume'

const EVERYTHING_UP = new Set([ENTRY, ALB, JUNCTION, READER, READER_VOLUME, WRITER, WRITER_VOLUME])

function itinerary(queries: QueryKind[], liveEdgeIds = EVERYTHING_UP) {
  return buildRequestItinerary({
    entryEdgeId: ENTRY,
    albEdgeId: ALB,
    junctionEdgeId: JUNCTION,
    readLegs: { instanceEdgeId: READER, volumeEdgeId: READER_VOLUME },
    writeLegs: { instanceEdgeId: WRITER, volumeEdgeId: WRITER_VOLUME },
    queries,
    liveEdgeIds,
  })
}

describe('the shape of a request', () => {
  it('arrives through the load balancer and leaves the same way', () => {
    const legs = itinerary(['read'])

    expect(legs[0]).toMatchObject({ edgeId: ENTRY, reversed: false })
    expect(legs[1]).toMatchObject({ edgeId: ALB, reversed: false })
    expect(legs.at(-2)).toMatchObject({ edgeId: ALB, reversed: true })
    expect(legs.at(-1)).toMatchObject({ edgeId: ENTRY, reversed: true })
  })

  it('goes to the database and comes back before answering the user', () => {
    const legs = itinerary(['read']).map((leg) => `${leg.edgeId}${leg.reversed ? ' back' : ''}`)

    expect(legs).toEqual([
      ENTRY,
      ALB,
      JUNCTION,
      READER,
      READER_VOLUME,
      `${READER_VOLUME} back`,
      `${READER} back`,
      `${JUNCTION} back`,
      `${ALB} back`,
      `${ENTRY} back`,
    ])
  })

  it('adds a round trip for each query it is given', () => {
    const one = itinerary(['read']).length
    const three = itinerary(['read', 'read', 'read']).length

    expect(three - one).toBe((one - 4) * 2)
  })

  it('travels every leg at the same speed', () => {
    const speeds = new Set(itinerary(['read']).map((entry) => entry.speedPxPerSecond))

    expect(speeds).toEqual(new Set([PACKET_SPEED_PX_PER_SECOND]))
  })

  it('sends writes to the writer and reads to the replica', () => {
    const legs = itinerary(['write', 'read'])

    expect(legs.some((leg) => leg.edgeId === WRITER)).toBe(true)
    expect(legs.some((leg) => leg.edgeId === READER)).toBe(true)
  })

  it('gives every leg of a request the same colour, whatever the query is', () => {
    const colours = new Set([...itinerary(['write']), ...itinerary(['read'])].map((leg) => leg.color))

    expect(colours).toEqual(new Set(['default']))
  })
})

describe('when the database cannot be reached', () => {
  it('turns the request around at the task instead of stranding it', () => {
    const legs = buildRequestItinerary({
      entryEdgeId: ENTRY,
      albEdgeId: ALB,
      junctionEdgeId: null,
      readLegs: null,
      writeLegs: null,
      queries: ['read'],
      liveEdgeIds: EVERYTHING_UP,
    })

    expect(legs.map((leg) => leg.edgeId)).toEqual([ENTRY, ALB, ALB, ENTRY])
  })

  it('skips the shared volume leg while it is missing', () => {
    const withoutVolume = new Set([ENTRY, ALB, JUNCTION, READER])
    const legs = itinerary(['read'], withoutVolume)

    expect(legs.some((leg) => leg.edgeId === READER_VOLUME)).toBe(false)
    expect(legs.some((leg) => leg.edgeId === READER)).toBe(true)
  })
})

describe('how many queries a request makes', () => {
  it('makes exactly one round trip to the database', () => {
    expect(queriesForNextRequest(0)).toHaveLength(WORKLOAD.queriesPerRequest)
  })

  it('keeps writes a minority across successive requests', () => {
    const kinds = Array.from({ length: 60 }, (_, rotation) => queriesForNextRequest(rotation)).flat()
    const writes = kinds.filter((kind) => kind === 'write').length

    expect(writes).toBeGreaterThan(0)
    expect(writes / kinds.length).toBeLessThan(0.5)
  })
})
