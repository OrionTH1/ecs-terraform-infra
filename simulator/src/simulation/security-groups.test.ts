import { describe, expect, it } from 'vitest'
import {
  ALB_TO_ECS_PAIR,
  ECS_TO_RDS_PAIR,
  SECURITY_GROUP_BOUNDARIES,
  boundaryDirection,
  formatRule,
  securityGroupBoundary,
  type SecurityGroupBoundary,
} from './security-groups'
import {
  JUNCTION_TO_READER_EDGE_ID,
  JUNCTION_TO_WRITER_EDGE_ID,
  albToTaskEdgeId,
  isEdgeInSecurityGroupPair,
  taskToJunctionEdgeId,
} from '../canvas/initial-graph'

function boundariesInPair(pairId: string): SecurityGroupBoundary[] {
  return Object.values(SECURITY_GROUP_BOUNDARIES).filter((boundary) => boundary.pairId === pairId)
}

describe('the catalog', () => {
  it('covers every handle that sits on a network boundary', () => {
    expect(Object.keys(SECURITY_GROUP_BOUNDARIES).sort()).toEqual([
      'alb:in',
      'alb:out',
      'rdsInstance:in',
      'task:in',
      'task:out',
    ])
  })

  it('has nothing to say about a control plane handle', () => {
    expect(securityGroupBoundary('alb', 'metric-out')).toBeNull()
    expect(securityGroupBoundary('autoScaling', 'desired-count-out')).toBeNull()
    expect(securityGroupBoundary('rdsInstance', 'replicate-in')).toBeNull()
  })

  it('gives every rule of a boundary the same direction', () => {
    for (const boundary of Object.values(SECURITY_GROUP_BOUNDARIES)) {
      const directions = new Set(boundary.rules.map((rule) => rule.direction))

      expect(directions.size).toBe(1)
    }
  })

  it('never declares a boundary with no rule at all', () => {
    for (const boundary of Object.values(SECURITY_GROUP_BOUNDARIES)) {
      expect(boundary.rules.length).toBeGreaterThan(0)
    }
  })
})

describe('rules that come in pairs', () => {
  it.each([ALB_TO_ECS_PAIR, ECS_TO_RDS_PAIR])('joins exactly two boundaries for %s', (pairId) => {
    expect(boundariesInPair(pairId)).toHaveLength(2)
  })

  it.each([ALB_TO_ECS_PAIR, ECS_TO_RDS_PAIR])('puts one egress against one ingress for %s', (pairId) => {
    const directions = boundariesInPair(pairId).map(boundaryDirection).sort()

    expect(directions).toEqual(['egress', 'ingress'])
  })

  it.each([ALB_TO_ECS_PAIR, ECS_TO_RDS_PAIR])('agrees on the port at both ends of %s', (pairId) => {
    const ports = new Set(boundariesInPair(pairId).flatMap((boundary) => boundary.rules.map((rule) => rule.port)))

    expect(ports.size).toBe(1)
  })

  it('points each side of a pair at the security group of the other', () => {
    const egress = securityGroupBoundary('alb', 'out')
    const ingress = securityGroupBoundary('task', 'in')

    expect(egress?.rules[0].peer).toBe(ingress?.rules[0].securityGroup)
    expect(ingress?.rules[0].peer).toBe(egress?.rules[0].securityGroup)
  })
})

describe('the public edge of the VPC', () => {
  it('leaves the load balancer ingress unpaired, since the internet has no security group', () => {
    expect(securityGroupBoundary('alb', 'in')?.pairId).toBeNull()
  })

  it('is the only boundary that opens to an address range instead of a security group', () => {
    const openToTheWorld = Object.values(SECURITY_GROUP_BOUNDARIES).filter((boundary) =>
      boundary.rules.some((rule) => rule.peer.includes('/')),
    )

    expect(openToTheWorld).toHaveLength(1)
  })
})

describe('which edges belong to a pair', () => {
  it('lights every alb to task edge for the front pair', () => {
    expect(isEdgeInSecurityGroupPair(albToTaskEdgeId('task-1'), ALB_TO_ECS_PAIR)).toBe(true)
    expect(isEdgeInSecurityGroupPair(albToTaskEdgeId('task-7'), ALB_TO_ECS_PAIR)).toBe(true)
  })

  it('lights the whole path to the database, junction included', () => {
    expect(isEdgeInSecurityGroupPair(taskToJunctionEdgeId('task-1'), ECS_TO_RDS_PAIR)).toBe(true)
    expect(isEdgeInSecurityGroupPair(JUNCTION_TO_WRITER_EDGE_ID, ECS_TO_RDS_PAIR)).toBe(true)
    expect(isEdgeInSecurityGroupPair(JUNCTION_TO_READER_EDGE_ID, ECS_TO_RDS_PAIR)).toBe(true)
  })

  it('keeps the two pairs from lighting each other up', () => {
    expect(isEdgeInSecurityGroupPair(albToTaskEdgeId('task-1'), ECS_TO_RDS_PAIR)).toBe(false)
    expect(isEdgeInSecurityGroupPair(JUNCTION_TO_WRITER_EDGE_ID, ALB_TO_ECS_PAIR)).toBe(false)
  })

  it('lights nothing while no boundary is hovered', () => {
    expect(isEdgeInSecurityGroupPair(albToTaskEdgeId('task-1'), null)).toBe(false)
    expect(isEdgeInSecurityGroupPair(JUNCTION_TO_WRITER_EDGE_ID, null)).toBe(false)
  })
})

describe('formatting a rule for the hover', () => {
  it('points the arrow at the resource when traffic is coming in', () => {
    expect(formatRule({ direction: 'ingress', securityGroup: 'ecs_sg', protocol: 'tcp', port: 8080, peer: 'allow_http' }))
      .toBe('tcp/8080 ← allow_http')
  })

  it('points the arrow away from the resource when traffic is leaving', () => {
    expect(formatRule({ direction: 'egress', securityGroup: 'ecs_sg', protocol: 'tcp', port: 5432, peer: 'rds_sg' }))
      .toBe('tcp/5432 → rds_sg')
  })
})
