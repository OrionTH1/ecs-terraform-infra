import type { XYPosition } from '@xyflow/react'
import type { ContentBox } from './frame-metrics'

export interface WallSize {
  width: number
  height: number
}

function boxAt(position: XYPosition, size: WallSize): ContentBox {
  return {
    left: position.x,
    top: position.y,
    right: position.x + size.width,
    bottom: position.y + size.height,
  }
}

function overlaps(one: ContentBox, other: ContentBox): boolean {
  return one.left < other.right && one.right > other.left && one.top < other.bottom && one.bottom > other.top
}

function distanceBetween(one: XYPosition, other: XYPosition): number {
  return Math.hypot(one.x - other.x, one.y - other.y)
}

export function pushedOutside(position: XYPosition, size: WallSize, wall: ContentBox): XYPosition {
  if (!overlaps(boxAt(position, size), wall)) return position

  const candidates: XYPosition[] = [
    { x: wall.left - size.width, y: position.y },
    { x: wall.right, y: position.y },
    { x: position.x, y: wall.top - size.height },
    { x: position.x, y: wall.bottom },
  ]

  return candidates.reduce((closest, candidate) =>
    distanceBetween(candidate, position) < distanceBetween(closest, position) ? candidate : closest,
  )
}

export function positionOutside(
  proposed: XYPosition,
  current: XYPosition,
  size: WallSize,
  wall: ContentBox,
): XYPosition {
  if (overlaps(boxAt(current, size), wall)) return proposed
  if (!overlaps(boxAt(proposed, size), wall)) return proposed

  const cameFrom = boxAt(current, size)
  const candidates: XYPosition[] = []

  if (cameFrom.right <= wall.left) candidates.push({ x: wall.left - size.width, y: proposed.y })
  if (cameFrom.left >= wall.right) candidates.push({ x: wall.right, y: proposed.y })
  if (cameFrom.bottom <= wall.top) candidates.push({ x: proposed.x, y: wall.top - size.height })
  if (cameFrom.top >= wall.bottom) candidates.push({ x: proposed.x, y: wall.bottom })

  const allowed = candidates.filter((candidate) => !overlaps(boxAt(candidate, size), wall))
  if (allowed.length === 0) return current

  return allowed.reduce((closest, candidate) =>
    distanceBetween(candidate, proposed) < distanceBetween(closest, proposed) ? candidate : closest,
  )
}
