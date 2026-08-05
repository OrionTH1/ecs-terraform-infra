import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { RdsInstanceFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { RdsIcon } from '../../icons'

const ENDPOINT_HANDLE_TOP = 30
const REPLICATION_HANDLE_TOP = 62

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
          <Handle
            type="target"
            position={Position.Right}
            id="manages-in"
            isConnectable={false}
            style={{ top: ENDPOINT_HANDLE_TOP }}
          />
          {data.role === 'writer' ? (
            <Handle
              type="source"
              position={Position.Right}
              id="replicate-out"
              isConnectable={false}
              style={{ top: REPLICATION_HANDLE_TOP }}
            />
          ) : null}
          {data.role === 'reader' ? (
            <Handle
              type="target"
              position={Position.Right}
              id="replicate-in"
              isConnectable={false}
              style={{ top: REPLICATION_HANDLE_TOP }}
            />
          ) : null}
        </>
      }
    >
      <div className="flex w-[164px] flex-col gap-1">
        <RateReadout value={data.requestsPerMinute} />
      </div>
    </NodeCard>
  )
}
