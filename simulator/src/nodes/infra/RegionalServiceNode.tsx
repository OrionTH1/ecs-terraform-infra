import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { RegionalServiceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { LogsIcon, RegistryIcon, SecretIcon, StorageIcon } from '../../icons'

const ROLE_ICON = {
  registry: <RegistryIcon />,
  logs: <LogsIcon />,
  secrets: <SecretIcon />,
  storage: <StorageIcon />,
}

export function RegionalServiceNode({ data }: NodeProps<RegionalServiceFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={ROLE_ICON[data.role]}
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
