import { describe, expect, it } from 'vitest'
import { SUBNET_FRAME_MIN_WIDTH, networkZoneFrames } from './network-zones'
import { frameContentBox, type ContentBox, type FrameBox } from './frame-metrics'
import {
  ALB_POSITION,
  AURORA_FRAME as REAL_AURORA_FRAME,
  CLUSTER_VOLUME_POSITION,
  ENDPOINT_CARD_HEIGHT,
  FALLBACK_CARD_HEIGHT,
  FALLBACK_CARD_WIDTH,
  endpointPositions,
  endpointRowBox,
  privateTierBoxes,
} from './initial-graph'

const ALB_BOX = { left: 360, top: 200, right: 570, bottom: 332 }
const SERVICE_FRAME: FrameBox = { position: { x: 876, y: 20 }, width: 322, height: 360 }
const AURORA_FRAME: FrameBox = { position: { x: 1548, y: 20 }, width: 764, height: 392 }

const REAL_ALB_BOX: ContentBox = {
  left: ALB_POSITION.x,
  top: ALB_POSITION.y,
  right: ALB_POSITION.x + FALLBACK_CARD_WIDTH,
  bottom: ALB_POSITION.y + FALLBACK_CARD_HEIGHT,
}

function zones() {
  return networkZoneFrames(ALB_BOX, [frameContentBox(SERVICE_FRAME), frameContentBox(AURORA_FRAME)])
}

function realZones(serviceFrame: FrameBox = SERVICE_FRAME) {
  return networkZoneFrames(REAL_ALB_BOX, privateTierBoxes(serviceFrame, ENDPOINT_CARD_HEIGHT))
}

function contains(outer: FrameBox, inner: FrameBox): boolean {
  const a = frameContentBox(outer)
  const b = frameContentBox(inner)

  return a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom
}

function containsBox(outer: FrameBox, inner: ContentBox): boolean {
  const a = frameContentBox(outer)

  return a.left <= inner.left && a.top <= inner.top && a.right >= inner.right && a.bottom >= inner.bottom
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

describe('the vpc endpoints', () => {
  it('keeps both of them inside the private tier', () => {
    const { privateSubnets } = realZones()

    expect(containsBox(privateSubnets, endpointRowBox(SERVICE_FRAME, ENDPOINT_CARD_HEIGHT))).toBe(true)
  })

  it('stands them side by side without overlapping', () => {
    const { interface: interfaceEndpoints, gateway } = endpointPositions(SERVICE_FRAME)

    expect(interfaceEndpoints.y).toBe(gateway.y)
    expect(gateway.x).toBeGreaterThan(interfaceEndpoints.x + FALLBACK_CARD_WIDTH)
  })

  it('clears the ecs service instead of sitting on top of it', () => {
    const { interface: interfaceEndpoints } = endpointPositions(SERVICE_FRAME)

    expect(interfaceEndpoints.y).toBeGreaterThan(SERVICE_FRAME.position.y + SERVICE_FRAME.height)
  })

  it('follows the service frame down as the task column grows', () => {
    const taller: FrameBox = { position: { x: 876, y: -200 }, width: 322, height: 800 }

    expect(endpointPositions(taller).interface.y).toBeGreaterThan(endpointPositions(SERVICE_FRAME).interface.y)
    expect(containsBox(realZones(taller).privateSubnets, endpointRowBox(taller, ENDPOINT_CARD_HEIGHT))).toBe(true)
  })
})

describe('the canvas the simulator actually draws', () => {
  it('wraps the real aurora cluster and load balancer without inverting anything', () => {
    const { vpc, publicSubnets, privateSubnets } = realZones()

    for (const frame of [vpc, publicSubnets, privateSubnets]) {
      expect(frame.width).toBeGreaterThan(0)
      expect(frame.height).toBeGreaterThan(0)
    }

    expect(contains(vpc, privateSubnets)).toBe(true)
    expect(contains(privateSubnets, REAL_AURORA_FRAME)).toBe(true)
  })

  it('leaves the cluster volume outside the vpc, where aurora storage actually lives', () => {
    expect(CLUSTER_VOLUME_POSITION.x).toBeGreaterThan(frameContentBox(realZones().vpc).right)
  })
})

describe('the control plane sits outside the network', () => {
  it('leaves room above the vpc for the regional services', () => {
    const { vpc, controlPlaneBottom } = zones()

    expect(controlPlaneBottom).toBeLessThan(vpc.position.y)
  })

  it('follows the vpc up when the service frame grows', () => {
    const taller: FrameBox = { position: { x: 876, y: -200 }, width: 322, height: 800 }
    const grown = networkZoneFrames(ALB_BOX, [frameContentBox(taller), frameContentBox(AURORA_FRAME)])

    expect(grown.controlPlaneBottom).toBeLessThan(zones().controlPlaneBottom)
  })
})
