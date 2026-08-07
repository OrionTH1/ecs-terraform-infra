import { describe, expect, it } from 'vitest'
import { SUBNET_FRAME_MIN_WIDTH, networkZoneFrames } from './network-zones'
import { frameContentBox, type FrameBox } from './frame-metrics'
import {
  ALB_POSITION,
  AURORA_FRAME as REAL_AURORA_FRAME,
  CLUSTER_VOLUME_POSITION,
  FALLBACK_CARD_HEIGHT,
  FALLBACK_CARD_WIDTH,
} from './initial-graph'

const ALB_BOX = { left: 360, top: 200, right: 570, bottom: 332 }
const SERVICE_FRAME: FrameBox = { position: { x: 876, y: 20 }, width: 322, height: 360 }
const AURORA_FRAME: FrameBox = { position: { x: 1548, y: 20 }, width: 764, height: 392 }

function zones() {
  return networkZoneFrames(ALB_BOX, SERVICE_FRAME, AURORA_FRAME)
}

function contains(outer: FrameBox, inner: FrameBox): boolean {
  const a = frameContentBox(outer)
  const b = frameContentBox(inner)

  return a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom
}

describe('nesting', () => {
  it('puts both subnet tiers inside the vpc', () => {
    const { vpc, publicSubnets, privateSubnets } = zones()

    expect(contains(vpc, publicSubnets)).toBe(true)
    expect(contains(vpc, privateSubnets)).toBe(true)
  })

  it('puts the load balancer in the public tier and nothing else', () => {
    const { publicSubnets, privateSubnets } = zones()
    const box = frameContentBox(publicSubnets)

    expect(box.left).toBeLessThanOrEqual(ALB_BOX.left)
    expect(box.right).toBeGreaterThanOrEqual(ALB_BOX.right)
    expect(box.right).toBeLessThan(frameContentBox(privateSubnets).left)
  })

  it('puts the ecs service and the aurora cluster in the private tier', () => {
    const { privateSubnets } = zones()

    expect(contains(privateSubnets, SERVICE_FRAME)).toBe(true)
    expect(contains(privateSubnets, AURORA_FRAME)).toBe(true)
  })

  it('never lets the two tiers overlap', () => {
    const { publicSubnets, privateSubnets } = zones()

    expect(frameContentBox(publicSubnets).right).toBeLessThan(frameContentBox(privateSubnets).left)
  })

  it('stands the two tiers side by side on the same top and bottom edge', () => {
    const { publicSubnets, privateSubnets } = zones()

    expect(publicSubnets.position.y).toBe(privateSubnets.position.y)
    expect(publicSubnets.height).toBe(privateSubnets.height)
  })

  it('keeps the narrow tier wide enough for its own header to fit', () => {
    const { publicSubnets } = zones()

    expect(publicSubnets.width).toBeGreaterThanOrEqual(SUBNET_FRAME_MIN_WIDTH)
  })

  it('leaves the tier that is already wide at its content width', () => {
    const { privateSubnets } = zones()

    expect(privateSubnets.width).toBeGreaterThan(SUBNET_FRAME_MIN_WIDTH)
  })
})

describe('the canvas the simulator actually draws', () => {
  it('wraps the real aurora cluster and load balancer without inverting anything', () => {
    const { vpc, publicSubnets, privateSubnets } = networkZoneFrames(
      {
        left: ALB_POSITION.x,
        top: ALB_POSITION.y,
        right: ALB_POSITION.x + FALLBACK_CARD_WIDTH,
        bottom: ALB_POSITION.y + FALLBACK_CARD_HEIGHT,
      },
      SERVICE_FRAME,
      REAL_AURORA_FRAME,
    )

    for (const frame of [vpc, publicSubnets, privateSubnets]) {
      expect(frame.width).toBeGreaterThan(0)
      expect(frame.height).toBeGreaterThan(0)
    }

    expect(contains(vpc, privateSubnets)).toBe(true)
    expect(contains(privateSubnets, REAL_AURORA_FRAME)).toBe(true)
  })

  it('leaves the cluster volume outside the vpc, where aurora storage actually lives', () => {
    const { vpc } = networkZoneFrames(
      {
        left: ALB_POSITION.x,
        top: ALB_POSITION.y,
        right: ALB_POSITION.x + FALLBACK_CARD_WIDTH,
        bottom: ALB_POSITION.y + FALLBACK_CARD_HEIGHT,
      },
      SERVICE_FRAME,
      REAL_AURORA_FRAME,
    )

    expect(CLUSTER_VOLUME_POSITION.x).toBeGreaterThan(frameContentBox(vpc).right)
  })
})

describe('the control plane sits outside the network', () => {
  it('leaves room above the vpc for the regional services', () => {
    const { vpc, controlPlaneBottom } = zones()

    expect(controlPlaneBottom).toBeLessThan(vpc.position.y)
  })

  it('follows the vpc up when the service frame grows', () => {
    const taller: FrameBox = { position: { x: 876, y: -200 }, width: 322, height: 800 }
    const grown = networkZoneFrames(ALB_BOX, taller, AURORA_FRAME)

    expect(grown.controlPlaneBottom).toBeLessThan(zones().controlPlaneBottom)
  })
})
