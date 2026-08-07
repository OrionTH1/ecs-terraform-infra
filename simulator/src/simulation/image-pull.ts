import { PACKET_DWELL_MS, PACKET_SPEED_PX_PER_SECOND, type ItineraryLeg } from './packets'
import type { TaskStatus } from '../types/task-data'

export const MAX_IMAGE_PULL_SPEED_PX_PER_SECOND = 2400

const IMAGE_PULL_STATUSES: TaskStatus[] = ['provisioning']

export interface ImagePullLegs {
  registryEgressEdgeId: string
  registryEdgeId: string
  storageEgressEdgeId: string
  storageEdgeId: string
  secondsRemaining: number
}

export function travelSecondsFor(secondsRemaining: number, legCount: number): number {
  return secondsRemaining - (legCount * PACKET_DWELL_MS) / 1000
}

export function imagePullSpeed(routeLengthPx: number, secondsRemaining: number, legCount: number): number {
  return routeLengthPx / travelSecondsFor(secondsRemaining, legCount)
}

export function fitsInsideThePull(routeLengthPx: number, secondsRemaining: number, legCount: number): boolean {
  if (routeLengthPx <= 0) return false
  if (travelSecondsFor(secondsRemaining, legCount) <= 0) return false

  return imagePullSpeed(routeLengthPx, secondsRemaining, legCount) <= MAX_IMAGE_PULL_SPEED_PX_PER_SECOND
}

export function pullSecondsRemaining(elapsedSimMs: number, pullDurationMs: number, timeScale: number): number {
  return Math.max(0, pullDurationMs - elapsedSimMs) / timeScale / 1000
}

function leg(edgeId: string, reversed: boolean, speedPxPerSecond: number): ItineraryLeg {
  return { edgeId, reversed, color: 'pull', speedPxPerSecond, entersNodeAtEnd: true }
}

function roundTrip(egressEdgeId: string, serviceEdgeId: string, speed: number): ItineraryLeg[] {
  return [
    leg(egressEdgeId, false, speed),
    leg(serviceEdgeId, false, speed),
    leg(serviceEdgeId, true, speed),
    leg(egressEdgeId, true, speed),
  ]
}

export function isPullingImageStatus(status: TaskStatus): boolean {
  return IMAGE_PULL_STATUSES.includes(status)
}

export function isPullingImage(statuses: TaskStatus[]): boolean {
  return statuses.some(isPullingImageStatus)
}

export function buildImagePullItinerary(
  legs: ImagePullLegs,
  liveEdgeIds: Set<string>,
  speedPxPerSecond = PACKET_SPEED_PX_PER_SECOND,
): ItineraryLeg[] {
  return [
    ...roundTrip(legs.registryEgressEdgeId, legs.registryEdgeId, speedPxPerSecond),
    ...roundTrip(legs.storageEgressEdgeId, legs.storageEdgeId, speedPxPerSecond),
  ].filter((entry) => liveEdgeIds.has(entry.edgeId))
}
