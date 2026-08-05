import type { TaskStatus } from '../types/task-data'

export const AUTOSCALING = {
  minCapacity: 2,
  maxCapacity: 4,
  targetRequestsPerMinutePerTask: 1000,
  scaleOutCooldownMs: 60_000,
  scaleInCooldownMs: 60_000,
  scaleOutEvaluationMs: 90_000,
  scaleInEvaluationMs: 5 * 60_000,
}

export const AWS_ALARM_EVALUATION = {
  scaleOutMs: 3 * 60_000,
  scaleInMs: 15 * 60_000,
}

export const HEALTH_CHECK = {
  intervalMs: 30_000,
  healthyThreshold: 2,
}

export const TASK_LIFECYCLE = {
  provisioningMs: 12_000,
  startingMs: 8_000,
  registeringMs: HEALTH_CHECK.healthyThreshold * HEALTH_CHECK.intervalMs,
  drainingMs: 5_000,
  failedLingerMs: 4_000,
}

export const STAGE_DURATION_MS: Record<TaskStatus, number | null> = {
  provisioning: TASK_LIFECYCLE.provisioningMs,
  starting: TASK_LIFECYCLE.startingMs,
  registering: TASK_LIFECYCLE.registeringMs,
  healthy: null,
  draining: TASK_LIFECYCLE.drainingMs,
  failed: null,
}

export const SCALE_IN_LATENCY_MS = AUTOSCALING.scaleInEvaluationMs

export const COLD_START_MS = TASK_LIFECYCLE.provisioningMs + TASK_LIFECYCLE.startingMs + TASK_LIFECYCLE.registeringMs

export const SIMULATION_START_DELAY_MS = 1000

export const TRAFFIC_UPDATE_MS = 10_000
export const RAMP_DURATION_MS = 5 * 60_000
export const BURST_PERIOD_MS = 2 * 60_000
export const BURST_PEAK_FRACTION = 0.3
export const BURST_FLOOR_FRACTION = 0.15

export const WAF = {
  rateLimitPer5Min: 2000,
  windowMs: 5 * 60_000,
  bucketMs: 30_000,
  evaluationIntervalMs: 30_000,
}

export const WAF_BUCKET_COUNT = WAF.windowMs / WAF.bucketMs

export const WAF_RATE_LIMIT_PER_MINUTE = WAF.rateLimitPer5Min / (WAF.windowMs / 60_000)

export const REQUEST_RATE_STEP = 100
export const DEFAULT_USER_REQUEST_RATE = 100

export const TIME_SCALES = [1, 10, 25, 60]
export const DEFAULT_TIME_SCALE = 25

export const RDS_READ_FRACTION = 0.8
