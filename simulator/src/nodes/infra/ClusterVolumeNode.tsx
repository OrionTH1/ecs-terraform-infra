import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ClusterVolumeFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { StorageIcon } from '../../icons'

const AVAILABILITY_ZONES = 3
const COPIES_PER_ZONE = 2
const TOTAL_COPIES = AVAILABILITY_ZONES * COPIES_PER_ZONE

export function ClusterVolumeNode({ data }: NodeProps<ClusterVolumeFlowNode>) {
  return (
    <NodeCard
      variant="infra"
      icon={<StorageIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={<Handle type="target" position={Position.Left} id="in" isConnectable={false} />}
    >
      <div className="flex w-[186px] flex-col gap-2">
        <div className="flex gap-1.5">
          {Array.from({ length: AVAILABILITY_ZONES }, (_, zone) => (
            <div key={zone} className="flex flex-1 flex-col gap-1 rounded-md border border-border px-1.5 py-1">
              <span className="text-center font-sans text-[9px] uppercase tracking-wider text-fg-muted">
                az {zone + 1}
              </span>
              <div className="flex justify-center gap-1">
                {Array.from({ length: COPIES_PER_ZONE }, (_, copy) => (
                  <span
                    key={copy}
                    className="copy-breathe h-1.5 w-1.5 rounded-full bg-status-healthy"
                    style={{
                      animationDelay: `calc(var(--motion-copy-breathe) * ${
                        (zone * COPIES_PER_ZONE + copy) / TOTAL_COPIES
                      })`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="font-mono text-[11px] text-fg-muted">
          {AVAILABILITY_ZONES * COPIES_PER_ZONE} copies · {AVAILABILITY_ZONES} AZs
        </span>
        <span className="font-mono text-[10px] text-fg-muted">regional · outside the vpc</span>
      </div>
    </NodeCard>
  )
}
