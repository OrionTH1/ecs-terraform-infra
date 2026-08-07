import type { NodeProps } from '@xyflow/react'
import type { VpcEndpointFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { EndpointIcon, GatewayIcon } from '../../icons'

export function VpcEndpointNode({ data }: NodeProps<VpcEndpointFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={data.kind === 'gateway' ? <GatewayIcon /> : <EndpointIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
    >
      <div className="flex w-[168px] flex-col gap-1.5">
        <div className="flex flex-col gap-1">
          {data.services.map((service) => (
            <div key={service} className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  data.isResolving ? 'cache-pulse bg-status-healthy' : 'bg-border'
                }`}
              />
              <span className="truncate font-mono text-[10px] text-fg-muted">{service}</span>
            </div>
          ))}
        </div>
        <span className="font-mono text-[10px] text-fg-muted">{data.footnote}</span>
      </div>
    </NodeCard>
  )
}
