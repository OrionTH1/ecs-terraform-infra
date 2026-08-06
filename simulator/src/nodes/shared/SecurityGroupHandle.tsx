import { Handle, type HandleProps } from '@xyflow/react'
import { boundaryDirection, boundaryKey, formatRule, securityGroupBoundary } from '../../simulation/security-groups'
import { useSecurityGroupStore } from '../../store/useSecurityGroupStore'

interface SecurityGroupHandleProps extends HandleProps {
  nodeType: string
  style?: React.CSSProperties
}

export function SecurityGroupHandle({ nodeType, id, ...handleProps }: SecurityGroupHandleProps) {
  const boundary = id ? securityGroupBoundary(nodeType, id) : null

  const key = id ? boundaryKey(nodeType, id) : ''
  const hoveredPairId = useSecurityGroupStore((state) => state.hoveredPairId)
  const hoveredKey = useSecurityGroupStore((state) => state.hoveredKey)
  const hoverBoundary = useSecurityGroupStore((state) => state.hoverBoundary)
  const clearBoundary = useSecurityGroupStore((state) => state.clearBoundary)

  if (!boundary) return <Handle id={id} {...handleProps} />

  const direction = boundaryDirection(boundary)
  const isPaired = boundary.pairId !== null && boundary.pairId === hoveredPairId
  const isHovered = hoveredKey === key
  const isLit = isHovered || isPaired

  const bar = (
    <span
      className={`h-3.5 w-[2.5px] shrink-0 rounded-full transition-colors duration-150 ${
        isLit ? 'bg-border-interaction' : 'bg-border'
      }`}
    />
  )

  const arrow = (
    <span
      className={`h-0 w-0 shrink-0 border-y-[4px] border-l-[6px] border-y-transparent transition-colors duration-150 ${
        isLit ? 'border-l-border-interaction' : 'border-l-border'
      }`}
    />
  )

  return (
    <Handle
      id={id}
      {...handleProps}
      className="sg-handle"
      onMouseEnter={() => hoverBoundary(key, boundary.pairId)}
      onMouseLeave={() => clearBoundary(key)}
    >
      <span
        className={`pointer-events-none flex items-center gap-[3px] ${
          direction === 'ingress' ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {bar}
        {arrow}
      </span>

      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max -translate-x-1/2 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 shadow-card transition-opacity duration-150 ${
          isHovered ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <span className="block font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">
          {direction} · {boundary.rules[0].securityGroup}
        </span>
        {boundary.rules.map((rule) => (
          <span key={`${rule.port}-${rule.peer}`} className="block font-mono text-[11px] text-fg">
            {formatRule(rule)}
          </span>
        ))}
      </span>
    </Handle>
  )
}
