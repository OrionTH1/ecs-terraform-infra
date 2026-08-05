import type { SimulatorFlowNode } from '../types/node-data'

export interface TrafficSourceNode {
  id: string
  sourceIps: string[]
  requestsPerMinute: number
}

export function isTrafficSource(node: SimulatorFlowNode): boolean {
  return node.type === 'user' || node.type === 'userGroup'
}

export function sourceIpsOf(node: SimulatorFlowNode): string[] {
  if (node.type === 'user') return [node.data.sourceIp]
  if (node.type === 'userGroup') return node.data.sourceIps
  return []
}

export function collectTakenIps(nodes: SimulatorFlowNode[], exceptNodeId: string): string[] {
  return nodes.filter((node) => node.id !== exceptNodeId).flatMap(sourceIpsOf)
}

export function toTrafficSource(node: SimulatorFlowNode): TrafficSourceNode | null {
  if (node.type === 'user') {
    return { id: node.id, sourceIps: [node.data.sourceIp], requestsPerMinute: node.data.requestsPerMinute }
  }

  if (node.type === 'userGroup') {
    return { id: node.id, sourceIps: node.data.sourceIps, requestsPerMinute: node.data.requestsPerMinute }
  }

  return null
}
