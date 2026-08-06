import { describe, expect, it } from 'vitest'
import { repairRoute, type PacketColor } from './packets'

const ENTRY = 'user-to-alb'
const ALB = 'alb-to-task'
const JUNCTION = 'task-to-junction'
const READER = 'junction-to-reader'
const READER_VOLUME = 'reader-to-volume'
const WRITER = 'junction-to-writer'
const WRITER_VOLUME = 'writer-to-volume'

const READ_ROUTE = {
  route: [ENTRY, ALB, JUNCTION, READER, READER_VOLUME],
  legColors: ['default', 'default', 'default', 'default', 'default'] as PacketColor[],
}

const WRITER_FALLBACK = [WRITER, WRITER_VOLUME]

function live(...edgeIds: string[]): Set<string> {
  return new Set(edgeIds)
}

const EVERYTHING_UP = live(ENTRY, ALB, JUNCTION, READER, READER_VOLUME, WRITER, WRITER_VOLUME)
const READER_DOWN = live(ENTRY, ALB, JUNCTION, WRITER, WRITER_VOLUME)

describe('an intact route', () => {
  it('is handed back untouched, without allocating a new one', () => {
    expect(repairRoute(READ_ROUTE, 1, EVERYTHING_UP, WRITER_FALLBACK)).toBe(READ_ROUTE)
  })
})

describe('a replica lost while requests are in flight', () => {
  it('keeps a request that is still crossing the load balancer edge', () => {
    const repaired = repairRoute(READ_ROUTE, 0, READER_DOWN, WRITER_FALLBACK)

    expect(repaired).not.toBeNull()
    expect(repaired?.route).toEqual([ENTRY, ALB, JUNCTION, WRITER, WRITER_VOLUME])
  })

  it('keeps a request that has already reached the task', () => {
    const repaired = repairRoute(READ_ROUTE, 2, READER_DOWN, WRITER_FALLBACK)

    expect(repaired?.route).toEqual([ENTRY, ALB, JUNCTION, WRITER, WRITER_VOLUME])
  })

  it('leaves the legs already travelled exactly as they were', () => {
    const repaired = repairRoute(READ_ROUTE, 1, READER_DOWN, WRITER_FALLBACK)

    expect(repaired?.route.slice(0, 3)).toEqual([ENTRY, ALB, JUNCTION])
  })

  it('keeps the rerouted legs coloured as the read they still are', () => {
    const repaired = repairRoute(READ_ROUTE, 1, READER_DOWN, WRITER_FALLBACK)

    expect(repaired?.legColors).toEqual(['default', 'default', 'default', 'default', 'default'])
  })

  it('drops only the request that was already crossing the dead instance edge', () => {
    expect(repairRoute(READ_ROUTE, 3, READER_DOWN, WRITER_FALLBACK)).toBeNull()
  })
})

describe('when there is nowhere to fall back to', () => {
  it('drops the request if the writer is gone as well', () => {
    expect(repairRoute(READ_ROUTE, 1, live(ENTRY, ALB, JUNCTION), WRITER_FALLBACK)).toBeNull()
  })

  it('drops the request when the cluster offers no fallback at all', () => {
    expect(repairRoute(READ_ROUTE, 1, READER_DOWN, [])).toBeNull()
  })

  it('still reroutes when only the shared volume edge is missing', () => {
    const repaired = repairRoute(READ_ROUTE, 1, live(ENTRY, ALB, JUNCTION, WRITER), WRITER_FALLBACK)

    expect(repaired?.route).toEqual([ENTRY, ALB, JUNCTION, WRITER])
  })
})

describe('a single-leg replication packet', () => {
  it('is dropped when its own edge disappears, having nowhere else to go', () => {
    const pulse = { route: ['page-cache'], legColors: ['write'] as PacketColor[] }

    expect(repairRoute(pulse, 0, live(WRITER), WRITER_FALLBACK)).toBeNull()
  })
})
