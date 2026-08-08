import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { RegionalServiceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RegistryIcon, StorageIcon } from '../../icons'

export function RegionalServiceNode({ data }: NodeProps<RegionalServiceFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={data.role === 'registry' ? <RegistryIcon /> : <StorageIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      handles={<Handle type="target" position={Position.Top} id="in" isConnectable={false} />}
    >
      <div className="flex w-[176px] flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              data.isServing ? 'cache-pulse bg-border-interaction' : 'bg-border'
            }`}
          />
          <span className="truncate font-mono text-[11px] text-fg-muted">{data.detail}</span>
        </div>
        <span className="font-mono text-[10px] text-fg-muted">{data.footnote}</span>
      </div>
    </NodeCard>
  )
}
