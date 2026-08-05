import {
  DEFAULT_USER_GROUP_REQUEST_RATE,
  DEFAULT_USER_GROUP_SIZE,
  DEFAULT_USER_REQUEST_RATE,
} from '../simulation/simulation-config'
import { generateSourceIp, generateSourceIps } from '../simulation/source-ip'
import { collectTakenIps } from '../simulation/traffic-source'
import type { SimulatorFlowNode } from '../types/node-data'

export type TrafficNodeType = 'user' | 'userGroup'

const USER_TOOLTIP =
  'Simulates traffic reaching the load balancer, in requests per minute. Constant holds the rate, Ramp climbs to it over 5 simulated minutes, Burst alternates between spikes and a quiet floor. Every user sends from a single source IP, which is the unit the WAF rate limit is counted against.'

const USER_GROUP_TOOLTIP =
  'A population of clients, each with its own source IP, all sending the same rate. Because the WAF rate limit is counted per IP, spreading the same total traffic across more IPs slips under a limit that a single client would trip — which is why a rate-based rule alone does not stop a distributed attack, and why the reputation and known-bad-inputs rule groups exist alongside it.'

export function isTrafficNodeType(value: string): value is TrafficNodeType {
  return value === 'user' || value === 'userGroup'
}

interface CreateTrafficNodeArgs {
  nodeType: TrafficNodeType
  id: string
  position: { x: number; y: number }
  existingNodes: SimulatorFlowNode[]
  clock: number
}

export function createTrafficNode({
  nodeType,
  id,
  position,
  existingNodes,
  clock,
}: CreateTrafficNodeArgs): SimulatorFlowNode {
  const takenIps = collectTakenIps(existingNodes, '')

  if (nodeType === 'user') {
    return {
      id,
      type: 'user',
      position,
      data: {
        label: 'User',
        tooltip: USER_TOOLTIP,
        pattern: 'constant',
        patternStartedAt: clock,
        peakRequestsPerMinute: DEFAULT_USER_REQUEST_RATE,
        rampFromRequestsPerMinute: 0,
        requestsPerMinute: DEFAULT_USER_REQUEST_RATE,
        sourceIp: generateSourceIp(takenIps),
        isRateLimited: false,
      },
    }
  }

  return {
    id,
    type: 'userGroup',
    position,
    data: {
      label: 'Group of Users',
      tooltip: USER_GROUP_TOOLTIP,
      pattern: 'constant',
      patternStartedAt: clock,
      peakRequestsPerMinute: DEFAULT_USER_GROUP_REQUEST_RATE,
      rampFromRequestsPerMinute: 0,
      requestsPerMinute: DEFAULT_USER_GROUP_REQUEST_RATE,
      userCount: DEFAULT_USER_GROUP_SIZE,
      sourceIps: generateSourceIps(DEFAULT_USER_GROUP_SIZE, takenIps),
      rateLimitedIpCount: 0,
    },
  }
}
