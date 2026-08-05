import { Handle, Position, type NodeProps } from '@xyflow/react'
import { RDS_READ_FRACTION } from '../../simulation/simulation-config'
import type { RdsClusterFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { RdsIcon } from '../../icons'

const READ_PERCENT = Math.round(RDS_READ_FRACTION * 100)

export function RdsClusterNode({ data }: NodeProps<RdsClusterFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={<RdsIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={
        <>
          <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
          <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
        </>
      }
    >
      <div className="flex w-[176px] flex-col gap-1">
        <RateReadout value={data.requestsPerMinute} />
        <span className="font-mono text-[11px] text-fg-muted">
          {READ_PERCENT}% read · {100 - READ_PERCENT}% write
        </span>
      </div>
    </NodeCard>
  )
}
