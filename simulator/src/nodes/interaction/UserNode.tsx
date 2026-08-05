import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { REQUEST_RATE_STEP } from '../../simulation/simulation-config'
import { generateSourceIp } from '../../simulation/source-ip'
import { TRAFFIC_PATTERNS } from '../../simulation/traffic-patterns'
import { useTrafficPattern } from '../../hooks/useTrafficPattern'
import { useSimulationStore } from '../../store/useSimulationStore'
import type { SimulatorFlowNode, UserFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { Stepper } from '../shared/Stepper'
import { RegenerateIcon, UserIcon } from '../../icons'

export function UserNode({ id, data }: NodeProps<UserFlowNode>) {
  const { updateNodeData, getNodes } = useReactFlow<SimulatorFlowNode>()

  const regenerateIp = () =>
    updateNodeData(id, {
      sourceIp: generateSourceIp(
        getNodes()
          .filter((node) => node.type === 'user' && node.id !== id)
          .map((node) => node.data.sourceIp as string),
      ),
    })

  useTrafficPattern({
    nodeId: id,
    pattern: data.pattern,
    patternStartedAt: data.patternStartedAt,
    peakRequestsPerMinute: data.peakRequestsPerMinute,
    rampFromRequestsPerMinute: data.rampFromRequestsPerMinute,
    requestsPerMinute: data.requestsPerMinute,
  })

  return (
    <NodeCard
      variant="interaction"
      icon={<UserIcon />}
      title={
        <span className={`font-mono text-[13px] tabular-nums ${data.isRateLimited ? 'text-status-error' : 'text-fg'}`}>
          {data.sourceIp}
        </span>
      }
      tooltip={data.tooltip}
      headerAction={
        <button
          type="button"
          title="Draw a new source IP"
          aria-label="Draw a new source IP"
          className="nodrag inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded text-fg-muted transition-colors duration-150 hover:bg-surface-raised hover:text-fg"
          onClick={regenerateIp}
        >
          <RegenerateIcon />
        </button>
      }
      status={data.isRateLimited ? 'error' : 'idle'}
    >
      <div className="flex w-[196px] flex-col gap-2">
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

        {data.pattern === 'constant' ? null : (
          <span className="font-mono text-[11px] tabular-nums text-fg-muted">sending {data.requestsPerMinute} req/min</span>
        )}

        <div className="flex overflow-hidden rounded-md border border-border">
          {TRAFFIC_PATTERNS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`nodrag flex-1 cursor-pointer border-l border-border px-1 py-1.5 font-sans text-[10px] font-medium uppercase tracking-wider transition-colors duration-150 first:border-l-0 ${
                option.value === data.pattern
                  ? 'bg-[rgba(59,130,246,0.18)] text-fg'
                  : 'bg-surface text-fg-muted hover:bg-surface-raised hover:text-fg'
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

        {data.isRateLimited ? (
          <span className="rounded-md border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] px-2 py-1 text-center font-sans text-[10px] font-medium uppercase tracking-wider text-status-error">
            rate limited
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </NodeCard>
  )
}
