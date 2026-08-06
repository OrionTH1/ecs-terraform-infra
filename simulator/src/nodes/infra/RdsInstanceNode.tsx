import { Handle, Position, type NodeProps } from '@xyflow/react'
import { TaskBlastEffect } from './TaskBlastEffect'
import { useRdsInstanceBlast } from '../../hooks/useRdsInstanceBlast'
import type { RdsInstanceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { AcuReadout } from '../shared/AcuReadout'
import { LatencyReadout } from '../shared/LatencyReadout'
import { RateReadout } from '../shared/RateReadout'
import { RdsIcon } from '../../icons'

export function RdsInstanceNode({ data }: NodeProps<RdsInstanceFlowNode>) {
  const { isTargetable, blast } = useRdsInstanceBlast({ role: data.role, lifecycle: data.lifecycle })

  return (
    <NodeCard
      variant="infra"
      icon={<RdsIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      isTargetable={isTargetable}
      isBlasted={data.lifecycle === 'failed'}
      overlay={data.lifecycle === 'failed' ? <TaskBlastEffect /> : null}
      onTargetClick={blast}
      handles={
        <>
          <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
          <Handle type="source" position={Position.Right} id="storage-out" isConnectable={false} />
          {data.role === 'writer' ? (
            <Handle type="source" position={Position.Bottom} id="replicate-out" isConnectable={false} />
          ) : null}
          {data.role === 'writer' ? (
          <div className="flex items-center gap-1.5 border-t border-border pt-1.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                data.isAbsorbingFallbackReads ? 'bg-status-warning cache-pulse' : 'bg-border'
              }`}
            />
            <span
              className={`font-mono text-[10px] ${
                data.isAbsorbingFallbackReads ? 'text-status-warning' : 'text-fg-muted'
              }`}
            >
              {data.isAbsorbingFallbackReads ? 'absorbing reads · no replica' : 'writes only'}
            </span>
          </div>
        ) : null}
        {data.role === 'reader' ? (
            <Handle type="target" position={Position.Top} id="replicate-in" isConnectable={false} />
          ) : null}
        </>
      }
    >
      <div className="flex w-[176px] flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <RateReadout value={data.requestsPerMinute} />
          <LatencyReadout meanMs={data.latencyMs} showTail={false} />
        </div>
        <AcuReadout acu={data.acu} />
        {data.role === 'writer' ? (
          <div className="flex items-center gap-1.5 border-t border-border pt-1.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                data.isAbsorbingFallbackReads ? 'bg-status-warning cache-pulse' : 'bg-border'
              }`}
            />
            <span
              className={`font-mono text-[10px] ${
                data.isAbsorbingFallbackReads ? 'text-status-warning' : 'text-fg-muted'
              }`}
            >
              {data.isAbsorbingFallbackReads ? 'absorbing reads · no replica' : 'writes only'}
            </span>
          </div>
        ) : null}
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
