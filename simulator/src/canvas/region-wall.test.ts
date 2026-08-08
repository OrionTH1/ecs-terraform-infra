import { describe, expect, it } from 'vitest'
import { positionOutside, pushedOutside } from './region-wall'

const WALL = { left: 200, top: 100, right: 600, bottom: 500 }
const SIZE = { width: 100, height: 60 }

const LEFT_OF_THE_WALL = { x: 50, y: 200 }
const ABOVE_THE_WALL = { x: 300, y: 0 }

describe('walking into the wall', () => {
  it('stops the node at the near face instead of letting it cross', () => {
    const blocked = positionOutside({ x: 300, y: 200 }, LEFT_OF_THE_WALL, SIZE, WALL)

    expect(blocked.x).toBe(WALL.left - SIZE.width)
  })

  it('keeps the axis it is not crossing free, so the node slides along the wall', () => {
    const blocked = positionOutside({ x: 300, y: 380 }, LEFT_OF_THE_WALL, SIZE, WALL)

    expect(blocked.y).toBe(380)
  })

  it('stops a node coming down from above at the top face', () => {
    const blocked = positionOutside({ x: 300, y: 200 }, ABOVE_THE_WALL, SIZE, WALL)

    expect(blocked.y).toBe(WALL.top - SIZE.height)
    expect(blocked.x).toBe(300)
  })

  it('stops a node coming from the right at the far face', () => {
    const blocked = positionOutside({ x: 400, y: 200 }, { x: 800, y: 200 }, SIZE, WALL)

    expect(blocked.x).toBe(WALL.right)
  })
})

describe('moves the wall has nothing to say about', () => {
  it('lets a node move freely while it stays outside', () => {
    const free = { x: 60, y: 300 }

    expect(positionOutside(free, LEFT_OF_THE_WALL, SIZE, WALL)).toEqual(free)
  })

  it('lets a node that is already inside keep moving, rather than teleporting it out', () => {
    const inside = { x: 300, y: 200 }
    const alsoInside = { x: 320, y: 220 }

    expect(positionOutside(alsoInside, inside, SIZE, WALL)).toEqual(alsoInside)
  })

  it('treats touching the face as outside, since the boxes do not overlap', () => {
    const flush = { x: WALL.left - SIZE.width, y: 200 }

    expect(positionOutside(flush, LEFT_OF_THE_WALL, SIZE, WALL)).toEqual(flush)
  })
})

describe('a corner approach', () => {
  it('picks the face that moves the node least', () => {
    const fromTheCorner = { x: 50, y: 20 }
    const blocked = positionOutside({ x: 210, y: 110 }, fromTheCorner, SIZE, WALL)

    expect(blocked.y).toBe(WALL.top - SIZE.height)
    expect(blocked.x).toBe(210)
  })

  it('never lets a move land inside, however deep into the wall it aimed', () => {
    const cornered = { x: 50, y: 20 }
    const deepInside = { x: 400, y: 300 }
    const blocked = positionOutside(deepInside, cornered, SIZE, WALL)
    const box = { left: blocked.x, top: blocked.y, right: blocked.x + SIZE.width, bottom: blocked.y + SIZE.height }

    expect(box.left < WALL.right && box.right > WALL.left && box.top < WALL.bottom && box.bottom > WALL.top).toBe(false)
  })
})

describe('a node created inside the wall', () => {
  it('leaves through the nearest face', () => {
    expect(pushedOutside({ x: 240, y: 300 }, SIZE, WALL)).toEqual({ x: WALL.left - SIZE.width, y: 300 })
  })

  it('leaves through the top when that is the shortest way out', () => {
    expect(pushedOutside({ x: 400, y: 120 }, SIZE, WALL)).toEqual({ x: 400, y: WALL.top - SIZE.height })
  })

  it('leaves a node that was never inside exactly where it is', () => {
    const outside = { x: 50, y: 300 }

    expect(pushedOutside(outside, SIZE, WALL)).toEqual(outside)
  })

  it('always lands clear of the wall, wherever it started', () => {
    for (const start of [{ x: 210, y: 110 }, { x: 550, y: 450 }, { x: 400, y: 300 }]) {
      const out = pushedOutside(start, SIZE, WALL)
      const box = { left: out.x, top: out.y, right: out.x + SIZE.width, bottom: out.y + SIZE.height }

      expect(box.left < WALL.right && box.right > WALL.left && box.top < WALL.bottom && box.bottom > WALL.top).toBe(false)
    }
  })
})
