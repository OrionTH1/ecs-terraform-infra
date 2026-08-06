import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { AlbFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { LatencyReadout } from '../shared/LatencyReadout'
import { LatencySparkline } from '../shared/LatencySparkline'
import { RateReadout } from '../shared/RateReadout'
import { LoadBalancerIcon } from '../../icons'

export function AlbNode({ data }: NodeProps<AlbFlowNode>) {
  const isRejecting = data.healthyTargetCount === 0 && data.requestsPerMinute > 0

  return (
    <NodeCard
      variant="infra"
      icon={<LoadBalancerIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={
        <>
          <Handle type="target" position={Position.Top} id="acl-in" isConnectable={false} />
          <Handle type="source" position={Position.Right} id="metric-out" isConnectable={false} style={{ top: '24%' }} />
          <Handle type="target" position={Position.Left} id="in" isConnectable={!data.provisioning} />
          <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
        </>
      }
    >
      <div className="flex w-[164px] flex-col gap-1">
        <RateReadout value={data.requestsPerMinute} size="md" />
        {isRejecting ? (
          <span className="font-mono text-[11px] text-status-error">503 · no healthy targets</span>
        ) : (
          <>
            <span className="font-mono text-[11px] text-fg-muted">
              {data.healthyTargetCount} healthy target{data.healthyTargetCount === 1 ? '' : 's'}
            </span>
            <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1.5">
              <LatencyReadout meanMs={data.latencyMs} size="md" />
              <LatencySparkline history={data.latencyHistory} currentMs={data.latencyMs} />
            </div>
          </>
        )}
      </div>
    </NodeCard>
  )
}
