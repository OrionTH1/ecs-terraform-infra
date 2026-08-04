import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { REQUEST_RATE_STEP } from '../../simulation/simulation-config'
import { TRAFFIC_PATTERNS } from '../../simulation/traffic-patterns'
import { useTrafficPattern } from '../../hooks/useTrafficPattern'
import { useSimulationStore } from '../../store/useSimulationStore'
import type { UserFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { Stepper } from '../shared/Stepper'
import { UserIcon } from '../shared/icons/UserIcon'

export function UserNode({ id, data }: NodeProps<UserFlowNode>) {
  const { updateNodeData } = useReactFlow()

  useTrafficPattern({
    nodeId: id,
    pattern: data.pattern,
    patternStartedAt: data.patternStartedAt,
    peakRequestsPerMinute: data.peakRequestsPerMinute,
    rampFromRequestsPerMinute: data.rampFromRequestsPerMinute,
    requestsPerMinute: data.requestsPerMinute,
  })

  return (
    <NodeCard variant="interaction" icon={<UserIcon />} title={data.label} tooltip={data.tooltip}>
      <div className="flex w-[186px] flex-col gap-2">
        <Stepper
          value={data.peakRequestsPerMinute}
          step={REQUEST_RATE_STEP}
          unit="req/min"
          onChange={(peakRequestsPerMinute) =>
            updateNodeData(id, {
              peakRequestsPerMinute,
              rampFromRequestsPerMinute: data.requestsPerMinute,
              patternStartedAt: useSimulationStore.getState().clock,
            })
          }
        />

        <div className="flex gap-1">
          {TRAFFIC_PATTERNS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`nodrag flex-1 cursor-pointer rounded-md border px-1 py-1 font-sans text-[10px] font-medium uppercase tracking-wider transition-colors duration-150 ${
                option.value === data.pattern
                  ? 'border-border-interaction bg-surface-raised text-fg'
                  : 'border-border bg-surface text-fg-muted hover:border-border-interaction hover:text-fg'
              }`}
              onClick={() =>
                updateNodeData(id, {
                  pattern: option.value,
                  rampFromRequestsPerMinute: 0,
                  patternStartedAt: useSimulationStore.getState().clock,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {data.pattern === 'constant' ? null : (
          <span className="font-mono text-[11px] tabular-nums text-fg-muted">now {data.requestsPerMinute} req/min</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </NodeCard>
  )
}
