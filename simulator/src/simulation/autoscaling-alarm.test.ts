import { describe, expect, it } from 'vitest'
import { alarmMetricName, currentAlarm, scalingIntent } from './autoscaling-alarm'
import { AUTOSCALING, AWS_ALARM_EVALUATION } from './simulation-config'

const BREACHED_AT = 120_000

describe('auto scaling alarm', () => {
  it('reports no alarm while the metric sits inside the target band', () => {
    expect(currentAlarm(null, null)).toMatchObject({ name: null, breachStartedAt: null })
  })

  it('surfaces the high alarm with the window the simulation actually waits', () => {
    expect(currentAlarm(BREACHED_AT, null)).toMatchObject({
      name: 'high',
      breachStartedAt: BREACHED_AT,
      evaluationMs: AUTOSCALING.scaleOutEvaluationMs,
    })
  })

  it('surfaces the low alarm when only the scale-in threshold is breached', () => {
    expect(currentAlarm(null, BREACHED_AT)).toMatchObject({
      name: 'low',
      breachStartedAt: BREACHED_AT,
      evaluationMs: AUTOSCALING.scaleInEvaluationMs,
    })
  })

  it('prefers scaling out when both thresholds are breached at once', () => {
    expect(currentAlarm(BREACHED_AT, BREACHED_AT).name).toBe('high')
  })

  it('keeps scale in slower than scale out, the way target tracking behaves', () => {
    expect(AUTOSCALING.scaleInEvaluationMs).toBeGreaterThan(AUTOSCALING.scaleOutEvaluationMs)
    expect(AWS_ALARM_EVALUATION.scaleInMs).toBeGreaterThan(AWS_ALARM_EVALUATION.scaleOutMs)
  })

  it('names each alarm the way application auto scaling does', () => {
    expect(alarmMetricName('high')).toBe('AlarmHigh')
    expect(alarmMetricName('low')).toBe('AlarmLow')
    expect(scalingIntent('high')).toBe('scale out')
    expect(scalingIntent('low')).toBe('scale in')
  })
})
