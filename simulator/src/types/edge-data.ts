import type { Edge } from '@xyflow/react'

export interface RequestFlowEdgeData extends Record<string, unknown> {
  requestsPerMinute: number
}

export type RequestFlowEdge = Edge<RequestFlowEdgeData, 'requestFlow'>

export interface ReplicationEdgeData extends Record<string, unknown> {
  isActive: boolean
}

export type ReplicationEdge = Edge<ReplicationEdgeData, 'replication'>

export type SignalVariant = 'association' | 'metric' | 'command'

export interface SignalEdgeData extends Record<string, unknown> {
  isActive: boolean
  variant: SignalVariant
  label: string
}

export type SignalEdge = Edge<SignalEdgeData, 'signal'>

export type SimulatorFlowEdge = RequestFlowEdge | ReplicationEdge | SignalEdge
