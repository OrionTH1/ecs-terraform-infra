import { AUTOSCALING } from './simulation-config'

export type AlarmName = 'high' | 'low'

export interface AutoScalingAlarm {
  name: AlarmName | null
  breachStartedAt: number | null
  evaluationMs: number
}

export const NO_ALARM: AutoScalingAlarm = {
  name: null,
  breachStartedAt: null,
  evaluationMs: 0,
}

export function currentAlarm(scaleOutBreachAt: number | null, scaleInBreachAt: number | null): AutoScalingAlarm {
  if (scaleOutBreachAt !== null) {
    return {
      name: 'high',
      breachStartedAt: scaleOutBreachAt,
      evaluationMs: AUTOSCALING.scaleOutEvaluationMs,
    }
  }

  if (scaleInBreachAt !== null) {
    return {
      name: 'low',
      breachStartedAt: scaleInBreachAt,
      evaluationMs: AUTOSCALING.scaleInEvaluationMs,
    }
  }

  return NO_ALARM
}

export function alarmMetricName(name: AlarmName): string {
  return name === 'high' ? 'AlarmHigh' : 'AlarmLow'
}

export function scalingIntent(name: AlarmName): string {
  return name === 'high' ? 'scale out' : 'scale in'
}
