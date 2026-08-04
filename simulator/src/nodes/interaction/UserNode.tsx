import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { REQUEST_RATE_STEP } from '../../simulation/simulation-config'
import type { UserFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { Stepper } from '../shared/Stepper'
import { UserIcon } from '../shared/icons/UserIcon'

export function UserNode({ id, data }: NodeProps<UserFlowNode>) {
  const { updateNodeData } = useReactFlow()

  return (
    <NodeCard variant="interaction" icon={<UserIcon />} title={data.label} tooltip={data.tooltip}>
      <Stepper
        value={data.requestsPerMinute}
        step={REQUEST_RATE_STEP}
        unit="req/min"
        onChange={(requestsPerMinute) => updateNodeData(id, { requestsPerMinute })}
      />
      <Handle type="source" position={Position.Right} id="out" />
    </NodeCard>
  )
}
