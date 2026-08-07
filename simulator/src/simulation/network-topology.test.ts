import { describe, expect, it } from 'vitest'
import {
  AVAILABILITY_ZONES,
  PRIVATE_SUBNETS,
  PUBLIC_SUBNETS,
  VPC_CIDR,
  availabilityZoneAt,
  subnetSummary,
} from './network-topology'

describe('the subnet layout terraform declares', () => {
  it('spreads both tiers over the same two availability zones', () => {
    expect(Object.keys(PUBLIC_SUBNETS.cidrByAvailabilityZone)).toEqual(AVAILABILITY_ZONES)
    expect(Object.keys(PRIVATE_SUBNETS.cidrByAvailabilityZone)).toEqual(AVAILABILITY_ZONES)
  })

  it('gives the load balancer more than one zone to survive in', () => {
    expect(AVAILABILITY_ZONES.length).toBeGreaterThanOrEqual(2)
  })

  it('never hands the same block to two subnets', () => {
    const blocks = [
      ...Object.values(PUBLIC_SUBNETS.cidrByAvailabilityZone),
      ...Object.values(PRIVATE_SUBNETS.cidrByAvailabilityZone),
    ]

    expect(new Set(blocks).size).toBe(blocks.length)
  })

  it('carves every subnet out of the vpc block', () => {
    const [prefix] = VPC_CIDR.split('/')
    const [first, second] = prefix.split('.')

    for (const cidr of Object.values(PRIVATE_SUBNETS.cidrByAvailabilityZone)) {
      expect(cidr.startsWith(`${first}.${second}.`)).toBe(true)
    }
  })
})

describe('naming a zone', () => {
  it('gives the two database instances different zones', () => {
    expect(availabilityZoneAt(0)).not.toBe(availabilityZoneAt(1))
  })

  it('wraps rather than running off the end', () => {
    expect(availabilityZoneAt(AVAILABILITY_ZONES.length)).toBe(availabilityZoneAt(0))
  })

  it('names every zone and its block in the frame summary', () => {
    const summary = subnetSummary(PUBLIC_SUBNETS)

    for (const zone of AVAILABILITY_ZONES) {
      expect(summary).toContain(zone)
      expect(summary).toContain(PUBLIC_SUBNETS.cidrByAvailabilityZone[zone])
    }
  })
})
