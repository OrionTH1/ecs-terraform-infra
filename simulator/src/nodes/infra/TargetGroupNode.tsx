import type { NodeProps } from '@xyflow/react'
import type { TargetGroupFlowNode } from '../../types/node-data'
import { FrameSummary, NodeFrame } from '../shared/NodeFrame'

export function TargetGroupNode({ data }: NodeProps<TargetGroupFlowNode>) {
  const hasNoTargets = data.registeredTargetCount === 0

  return (
    <NodeFrame
      label={data.label}
      tooltip={data.tooltip}
      width={data.width}
      height={data.height}
      tone={hasNoTargets ? 'error' : 'membership'}
      summary={
        <FrameSummary tone={hasNoTargets ? 'error' : 'muted'}>
          {data.registeredTargetCount} registered · {data.healthyTargetCount} healthy
        </FrameSummary>
      }
    />
  )
}
