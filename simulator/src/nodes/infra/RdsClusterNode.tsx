import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { RdsClusterFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RdsIcon } from '../../icons'

const ENDPOINTS = [
  { label: 'writer endpoint', target: 'Writer Instance' },
  { label: 'reader endpoint', target: 'Reader Instance' },
]

export function RdsClusterNode({ data }: NodeProps<RdsClusterFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={<RdsIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={<Handle type="source" position={Position.Left} id="manages-out" isConnectable={false} />}
    >
      <div className="flex w-[186px] flex-col gap-1.5">
        {ENDPOINTS.map((endpoint) => (
          <div key={endpoint.label} className="flex flex-col">
            <span className="font-mono text-[11px] text-fg">{endpoint.label}</span>
            <span className="font-mono text-[10px] text-fg-muted">resolves to {endpoint.target}</span>
          </div>
        ))}
        <span className="border-t border-border pt-1.5 font-mono text-[10px] text-fg-muted">
          DNS only · no traffic passes through
        </span>
      </div>
    </NodeCard>
  )
}
