import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EcsServiceFlowNode } from '../../types/node-data'
import { FrameSummary, NodeFrame } from '../shared/NodeFrame'
import { EcsServiceIcon } from '../../icons'

export function EcsServiceNode({ data }: NodeProps<EcsServiceFlowNode>) {
  return (
    <NodeFrame
      label={data.label}
      tooltip={data.tooltip}
      width={data.width}
      height={data.height}
      tone="ownership"
      icon={<EcsServiceIcon />}
      summary={
        <FrameSummary>
          desired {data.desiredCount} · running {data.runningTaskCount}
          {data.pendingTaskCount > 0 ? ` · pending ${data.pendingTaskCount}` : ''}
        </FrameSummary>
      }
      handles={
        <Handle type="target" position={Position.Top} id="desired-count-in" isConnectable={false} />
      }
    />
  )
}
