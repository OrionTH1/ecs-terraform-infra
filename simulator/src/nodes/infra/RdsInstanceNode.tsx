import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { RdsInstanceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { RdsIcon } from '../../icons'

export function RdsInstanceNode({ data }: NodeProps<RdsInstanceFlowNode>) {
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
          <Handle type="source" position={Position.Right} id="storage-out" isConnectable={false} />
          {data.role === 'writer' ? (
            <Handle type="source" position={Position.Bottom} id="replicate-out" isConnectable={false} />
          ) : null}
          {data.role === 'reader' ? (
            <Handle type="target" position={Position.Top} id="replicate-in" isConnectable={false} />
          ) : null}
        </>
      }
    >
      <div className="flex w-[176px] flex-col gap-1.5">
        <RateReadout value={data.requestsPerMinute} />
        {data.role === 'reader' ? (
          <div className="flex items-center gap-1.5 border-t border-border pt-1.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                data.isCacheInvalidating ? 'bg-status-warning cache-pulse' : 'bg-border'
              }`}
            />
            <span
              className={`font-mono text-[10px] ${data.isCacheInvalidating ? 'text-status-warning' : 'text-fg-muted'}`}
            >
              {data.isCacheInvalidating ? 'page cache invalidating' : 'page cache warm'}
            </span>
          </div>
        ) : null}
      </div>
    </NodeCard>
  )
}
