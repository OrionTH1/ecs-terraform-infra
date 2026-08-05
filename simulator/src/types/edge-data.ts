import type { Edge } from '@xyflow/react'

export interface RequestFlowEdgeData extends Record<string, unknown> {
  requestsPerMinute: number
}

export type RequestFlowEdge = Edge<RequestFlowEdgeData, 'requestFlow'>

export interface ReplicationEdgeData extends Record<string, unknown> {
  isActive: boolean
}

export type ReplicationEdge = Edge<ReplicationEdgeData, 'replication'>

export interface AssociationEdgeData extends Record<string, unknown> {
  isActive: boolean
}

export type AssociationEdge = Edge<AssociationEdgeData, 'association'>

export type SimulatorFlowEdge = RequestFlowEdge | ReplicationEdge | AssociationEdge
