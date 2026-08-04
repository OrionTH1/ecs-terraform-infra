import type { Edge } from '@xyflow/react'

export interface RequestFlowEdgeData extends Record<string, unknown> {
  requestsPerMinute: number
}

export type RequestFlowEdge = Edge<RequestFlowEdgeData, 'requestFlow'>
