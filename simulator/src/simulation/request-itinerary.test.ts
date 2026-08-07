import { describe, expect, it } from 'vitest'
import { buildRequestItinerary, queriesForNextRequest, queryCountFor, type QueryKind } from './request-itinerary'
import { DATABASE_SPEED_MULTIPLIER, PACKET_SPEED_PX_PER_SECOND } from './packets'
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

  it('makes one round trip per query', () => {
    const one = itinerary(['read']).length
    const three = itinerary(['read', 'read', 'read']).length

    expect(three - one).toBe((one - 4) * 2)
  })

  it('sends writes to the writer and reads to the replica', () => {
    const legs = itinerary(['write', 'read'])

    expect(legs.some((leg) => leg.edgeId === WRITER)).toBe(true)
    expect(legs.some((leg) => leg.edgeId === READER)).toBe(true)
  })

  it('colours only the database legs of a write', () => {
    const legs = itinerary(['write'])

    expect(legs.filter((leg) => leg.color === 'write').every((leg) => leg.edgeId !== ENTRY)).toBe(true)
    expect(legs[0].color).toBe('default')
  })
})

describe('speed along the way', () => {
  it('crosses the internet leg at the base speed', () => {
    expect(itinerary(['read'])[0].speedPxPerSecond).toBe(PACKET_SPEED_PX_PER_SECOND)
  })

  it('runs the in-vpc database legs faster, as a local query is', () => {
    const database = itinerary(['read']).find((leg) => leg.edgeId === READER)

    expect(database?.speedPxPerSecond).toBe(PACKET_SPEED_PX_PER_SECOND * DATABASE_SPEED_MULTIPLIER)
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
  it('never asks for fewer than the floor or more than the ceiling', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const count = queryCountFor(roll)

      expect(count).toBeGreaterThanOrEqual(WORKLOAD.minQueriesPerRequest)
      expect(count).toBeLessThanOrEqual(WORKLOAD.maxQueriesPerRequest)
    }
  })

  it('reaches both ends of the range', () => {
    expect(queryCountFor(0)).toBe(WORKLOAD.minQueriesPerRequest)
    expect(queryCountFor(0.999)).toBe(WORKLOAD.maxQueriesPerRequest)
  })

  it('keeps writes a minority of the queries it hands out', () => {
    const kinds = Array.from({ length: 60 }, (_, rotation) => queriesForNextRequest(rotation, 0.999)).flat()
    const writes = kinds.filter((kind) => kind === 'write').length

    expect(writes).toBeGreaterThan(0)
    expect(writes / kinds.length).toBeLessThan(0.5)
  })
})
