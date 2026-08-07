import { PACKET_SPEED_PX_PER_SECOND, type ItineraryLeg } from './packets'
import type { TaskStatus } from '../types/task-data'

export const IMAGE_PULL_LAYERS_PER_SECOND = 1.4

const IMAGE_PULL_STATUSES: TaskStatus[] = ['provisioning', 'starting']

export interface ImagePullLegs {
  registryEgressEdgeId: string
  registryEdgeId: string
  storageEgressEdgeId: string
  storageEdgeId: string
}

function leg(edgeId: string, reversed: boolean): ItineraryLeg {
  return { edgeId, reversed, color: 'pull', speedPxPerSecond: PACKET_SPEED_PX_PER_SECOND, entersNodeAtEnd: true }
}

function roundTrip(egressEdgeId: string, serviceEdgeId: string): ItineraryLeg[] {
  return [leg(egressEdgeId, false), leg(serviceEdgeId, false), leg(serviceEdgeId, true), leg(egressEdgeId, true)]
}

export function isPullingImageStatus(status: TaskStatus): boolean {
  return IMAGE_PULL_STATUSES.includes(status)
}

export function isPullingImage(statuses: TaskStatus[]): boolean {
  return statuses.some(isPullingImageStatus)
}

export function buildImagePullItinerary(legs: ImagePullLegs, liveEdgeIds: Set<string>): ItineraryLeg[] {
  return [
    ...roundTrip(legs.registryEgressEdgeId, legs.registryEdgeId),
    ...roundTrip(legs.storageEgressEdgeId, legs.storageEdgeId),
  ].filter((entry) => liveEdgeIds.has(entry.edgeId))
}
