import { Handle, Position, type NodeProps } from '@xyflow/react'
import { WAF, WAF_RATE_LIMIT_PER_MINUTE } from '../../simulation/simulation-config'
import type { WafFlowNode } from '../../types/node-data'
import { NodeCard } from '../shared/NodeCard'
import { RateReadout } from '../shared/RateReadout'
import { WafIcon } from '../../icons'

const RATE_LIMIT_LABEL = `${WAF.rateLimitPer5Min.toLocaleString('en-US')} req / 5 min per IP`

const MAX_LISTED_IPS = 2
const BLOCK_RESPONSE_CODE = 403

const RESERVED_CONTENT_HEIGHT = 'min-h-[190px]'

export function WafNode({ data }: NodeProps<WafFlowNode>) {
  const blockedIpCount = data.blockedIps.length
  const listedIps = data.blockedIps.slice(0, MAX_LISTED_IPS)
  const hiddenIpCount = blockedIpCount - listedIps.length

  return (
    <NodeCard
      variant="control"
      icon={<WafIcon />}
      title={data.label}
      tooltip={data.tooltip}
      status={data.status}
      provisioning={data.provisioning}
      handles={<Handle type="source" position={Position.Bottom} id="acl-out" isConnectable={false} />}
    >
      <div className={`flex w-[196px] flex-col gap-1.5 ${RESERVED_CONTENT_HEIGHT}`}>
        <RateReadout value={data.inspectedRequestsPerMinute} />
        <span className="font-mono text-[11px] text-fg-muted">inspected at the load balancer</span>

        <div className="mt-0.5 flex flex-col gap-1 border-t border-border pt-2">
          <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">rate limit</span>
          <span className="font-mono text-[11px] text-fg-muted">
            {RATE_LIMIT_LABEL} · {WAF_RATE_LIMIT_PER_MINUTE}/min
          </span>
        </div>

        {blockedIpCount > 0 ? (
          <div className="flex flex-col gap-1 rounded-md border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] px-2 py-1.5">
            <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-status-error">
              blocking {blockedIpCount} IP{blockedIpCount === 1 ? '' : 's'}
            </span>
            {listedIps.map((ip) => (
              <span key={ip} className="font-mono text-[10px] tabular-nums text-fg">
                {ip}
              </span>
            ))}
            {hiddenIpCount > 0 ? (
              <span className="font-mono text-[10px] tabular-nums text-fg-muted">+{hiddenIpCount} more</span>
            ) : null}
          </div>
        ) : null}

        <span className="mt-auto font-mono text-[11px] tabular-nums text-fg-muted">
          {Math.round(data.blockedRequests).toLocaleString('en-US')} requests blocked · {BLOCK_RESPONSE_CODE}
        </span>
      </div>
    </NodeCard>
  )
}
