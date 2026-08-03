/**
 * Values marked REAL come straight from infra/modules/ecs/autoscaling.tf, variables.tf,
 * and infra/modules/alb/main.tf — the simulator must stay identical to them.
 * Values marked ESTIMATE are not decisions documented in the Terraform (container boot
 * time, drain time); they're shortened for a watchable live demo and called out as such.
 */
export const AUTOSCALING = {
  /** REAL — aws_appautoscaling_target.backend */
  minCapacity: 2,
  maxCapacity: 4,
  /** REAL — target_tracking_scaling_policy_configuration, ALBRequestCountPerTarget */
  targetRequestsPerMinutePerTask: 1000,
  /** REAL — scale_out_cooldown / scale_in_cooldown, in seconds */
  scaleOutCooldownMs: 60_000,
  scaleInCooldownMs: 60_000,
}

export const HEALTH_CHECK = {
  /** REAL — alb target group health_check block */
  intervalMs: 30_000,
  healthyThreshold: 2,
}

export const TASK_LIFECYCLE = {
  /** ESTIMATE — Fargate image pull + ENI attach for a tiny Express image */
  provisioningMs: 12_000,
  /** ESTIMATE — container start + app boot */
  startingMs: 8_000,
  /** REAL — registering stage waits out the ALB's healthyThreshold * intervalMs */
  registeringMs: HEALTH_CHECK.healthyThreshold * HEALTH_CHECK.intervalMs,
  /** ESTIMATE — target group deregistration_delay isn't set in Terraform (AWS default
   * is 300s); that's too slow to watch live, so this is a shortened stand-in. */
  drainingMs: 5_000,
}

export const targetRequestsPerSecondPerTask = AUTOSCALING.targetRequestsPerMinutePerTask / 60
