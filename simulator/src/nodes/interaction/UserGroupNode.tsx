import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { MAX_USER_GROUP_SIZE, MIN_USER_GROUP_SIZE, USER_GROUP_SIZE_STEP } from '../../simulation/simulation-config'
import { generateSourceIps, resizeSourceIps } from '../../simulation/source-ip'
import { collectTakenIps } from '../../simulation/traffic-source'
import { useTrafficPattern } from '../../hooks/useTrafficPattern'
import { useSimulationStore } from '../../store/useSimulationStore'
import type { SimulatorFlowNode, UserGroupFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { Stepper } from '../shared/Stepper'
import { TrafficControls } from './TrafficControls'
import { RegenerateIcon, UserGroupIcon } from '../../icons'

export function UserGroupNode({ id, data }: NodeProps<UserGroupFlowNode>) {
  const { updateNodeData, getNodes, deleteElements } = useReactFlow<SimulatorFlowNode>()

  const totalRequestsPerMinute = data.requestsPerMinute * data.userCount
  const isRateLimited = data.rateLimitedIpCount > 0

  const changeUserCount = (userCount: number) => {
    const clamped = Math.min(MAX_USER_GROUP_SIZE, Math.max(MIN_USER_GROUP_SIZE, userCount))
    updateNodeData(id, {
      userCount: clamped,
      sourceIps: resizeSourceIps(data.sourceIps, clamped, collectTakenIps(getNodes(), id)),
    })
  }

  const regenerateIps = () =>
    updateNodeData(id, { sourceIps: generateSourceIps(data.userCount, collectTakenIps(getNodes(), id)) })

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
      icon={<UserGroupIcon />}
      title={
        <span className={`font-mono text-[13px] tabular-nums ${isRateLimited ? 'text-status-error' : 'text-fg'}`}>
          {data.userCount} source IPs
        </span>
      }
      tooltip={data.tooltip}
      headerAction={
        <button
          type="button"
          title="Draw a new set of source IPs"
          aria-label="Draw a new set of source IPs"
          className="nodrag inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded text-fg-muted transition-colors duration-150 hover:bg-surface-raised hover:text-fg"
          onClick={regenerateIps}
        >
          <RegenerateIcon />
        </button>
      }
      status={isRateLimited ? 'error' : 'idle'}
      onRemove={() => deleteElements({ nodes: [{ id }] })}
      removeLabel="Remove this group"
      handles={<Handle type="source" position={Position.Right} id="out" />}
    >
      <div className="flex w-[196px] flex-col gap-2">
        <Stepper
          value={data.userCount}
          min={MIN_USER_GROUP_SIZE}
          step={USER_GROUP_SIZE_STEP}
          unit="users"
          onChange={changeUserCount}
        />

        <TrafficControls
          peakRequestsPerMinute={data.peakRequestsPerMinute}
          requestsPerMinute={data.requestsPerMinute}
          pattern={data.pattern}
          rateUnit="req/min each"
          summary={
            <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
              <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">total</span>
              <span className="font-mono text-[13px] font-medium tabular-nums text-fg">
                {totalRequestsPerMinute.toLocaleString('en-US')}
                <span className="ml-1 font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">
                  req/min
                </span>
              </span>
            </div>
          }
          warning={
            isRateLimited ? (
              <span className="rounded-md border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] px-2 py-1 text-center font-sans text-[10px] font-medium uppercase tracking-wider text-status-error">
                {data.rateLimitedIpCount} of {data.userCount} rate limited
              </span>
            ) : null
          }
          onRateChange={(peakRequestsPerMinute) =>
            updateNodeData(id, {
              peakRequestsPerMinute,
              rampFromRequestsPerMinute: data.requestsPerMinute,
              patternStartedAt: useSimulationStore.getState().clock,
            })
          }
          onPatternChange={(pattern) =>
            updateNodeData(id, {
              pattern,
              rampFromRequestsPerMinute: 0,
              patternStartedAt: useSimulationStore.getState().clock,
            })
          }
        />
      </div>
    </NodeCard>
  )
}
