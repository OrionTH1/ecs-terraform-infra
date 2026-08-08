import { PACKET_DWELL_MS, PACKET_SPEED_PX_PER_SECOND, type ItineraryLeg } from './packets'
import type { TaskStatus } from '../types/task-data'

const IMAGE_PULL_STATUSES: TaskStatus[] = ['provisioning']

export interface ImagePullLegs {
  taskId: string
  registryEgressEdgeId: string
  registryEdgeId: string
  storageEgressEdgeId: string
  storageEdgeId: string
  secondsRemaining: number
  timeScale: number
}

export function pullDwellMs(timeScale: number): number {
  return PACKET_DWELL_MS / timeScale
}

export function travelSecondsFor(secondsRemaining: number, legCount: number, timeScale: number): number {
  return secondsRemaining - (legCount * pullDwellMs(timeScale)) / 1000
}

export function imagePullSpeed(
  routeLengthPx: number,
  secondsRemaining: number,
  legCount: number,
  timeScale: number,
): number {
  return routeLengthPx / travelSecondsFor(secondsRemaining, legCount, timeScale)
}

export function pullSecondsRemaining(elapsedSimMs: number, pullDurationMs: number, timeScale: number): number {
  return Math.max(0, pullDurationMs - elapsedSimMs) / timeScale / 1000
}

function leg(edgeId: string, reversed: boolean, speedPxPerSecond: number, dwellMs: number): ItineraryLeg {
  return { edgeId, reversed, color: 'default', speedPxPerSecond, entersNodeAtEnd: true, dwellMs }
}

function roundTrip(egressEdgeId: string, serviceEdgeId: string, speed: number, dwellMs: number): ItineraryLeg[] {
  return [
    leg(egressEdgeId, false, speed, dwellMs),
    leg(serviceEdgeId, false, speed, dwellMs),
    leg(serviceEdgeId, true, speed, dwellMs),
    leg(egressEdgeId, true, speed, dwellMs),
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
  dwellMs = PACKET_DWELL_MS,
): ItineraryLeg[] {
  return [
    ...roundTrip(legs.registryEgressEdgeId, legs.registryEdgeId, speedPxPerSecond, dwellMs),
    ...roundTrip(legs.storageEgressEdgeId, legs.storageEdgeId, speedPxPerSecond, dwellMs),
  ].filter((entry) => liveEdgeIds.has(entry.edgeId))
}
