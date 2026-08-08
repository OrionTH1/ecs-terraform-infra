import { Handle, Position, type NodeProps } from '@xyflow/react'
import { alarmMetricName, scalingIntent } from '../../simulation/autoscaling-alarm'
import { useRecentChange } from '../../hooks/useRecentChange'
import type { AutoScalingFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { StageProgress, type StageTone } from '../shared/StageProgress'
import { TargetUtilization } from '../shared/TargetUtilization'
import { AutoScalingIcon } from '../../icons'

const DESIRED_COUNT_HIGHLIGHT_MS = 1400

const ALARM_TONE: Record<'high' | 'low', StageTone> = {
  high: 'warning',
  low: 'creating',
}

export function AutoScalingNode({ data }: NodeProps<AutoScalingFlowNode>) {
  const { alarm } = data
  const hasJustScaled = useRecentChange(data.desiredCount, DESIRED_COUNT_HIGHLIGHT_MS)

  return (
    <NodeCard
      variant="control"
      icon={<AutoScalingIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={
        <>
          <Handle type="target" position={Position.Left} id="metric-in" isConnectable={false} />
          <Handle type="source" position={Position.Bottom} id="desired-count-out" isConnectable={false} />
        </>
      }
    >
      <div className="flex w-[196px] flex-col gap-2.5">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] text-fg-muted">ALBRequestCountPerTarget</span>
          <TargetUtilization perTask={data.requestsPerMinutePerTask} target={data.targetRequestsPerMinutePerTask} />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-2">
          <span className="whitespace-nowrap font-mono text-[11px] text-fg">
            {alarm.name === null ? (
              <span className="text-fg-muted">alarms OK</span>
            ) : (
              <>
                <span className={alarm.name === 'high' ? 'text-status-warning' : 'text-border-interaction'}>
                  {alarmMetricName(alarm.name)}
                </span>
                <span className="text-fg-muted"> · {scalingIntent(alarm.name)}</span>
              </>
            )}
          </span>
          <StageProgress
            durationMs={alarm.name === null ? null : alarm.evaluationMs}
            startedAt={alarm.breachStartedAt ?? 0}
            tone={alarm.name === null ? 'creating' : ALARM_TONE[alarm.name]}
          />
        </div>

        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
          <span className="font-mono text-[11px] tabular-nums text-fg-muted">
            capacity {data.minCapacity}–{data.maxCapacity}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-fg-muted">
            desired{' '}
            <span
              className={`font-medium transition-colors duration-300 ${
                hasJustScaled ? 'text-border-interaction' : 'text-fg'
              }`}
            >
              {data.desiredCount}
            </span>
          </span>
        </div>
      </div>
    </NodeCard>
  )
}
