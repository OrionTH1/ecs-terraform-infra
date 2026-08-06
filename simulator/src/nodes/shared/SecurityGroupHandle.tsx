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
  const toggleBoundary = useSecurityGroupStore((state) => state.toggleBoundary)
  const clearBoundary = useSecurityGroupStore((state) => state.clearBoundary)

  if (!boundary) return <Handle id={id} {...handleProps} />

  const direction = boundaryDirection(boundary)
  const isIngress = direction === 'ingress'
  const isPaired = boundary.pairId !== null && boundary.pairId === hoveredPairId
  const isOpen = hoveredKey === key
  const isLit = isOpen || isPaired

  const markClass = `shrink-0 transition-colors duration-150 ${isLit ? 'lit' : ''}`

  return (
    <Handle
      id={id}
      {...handleProps}
      className={`sg-handle ${isOpen ? 'sg-handle-open' : ''}`}
      tabIndex={0}
      role="button"
      aria-expanded={isOpen}
      aria-label={`${direction} ${boundary.rules[0].securityGroup}: ${boundary.rules.map(formatRule).join(', ')}`}
      onMouseEnter={() => hoverBoundary(key, boundary.pairId)}
      onMouseLeave={() => clearBoundary(key)}
      onFocus={() => hoverBoundary(key, boundary.pairId)}
      onBlur={() => clearBoundary(key)}
      onClick={() => toggleBoundary(key, boundary.pairId)}
    >
      <span
        className={`pointer-events-none flex items-center gap-[3px] ${isIngress ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <span className={`${markClass} sg-bar`} />
        <span className={`${markClass} sg-arrow`} />
      </span>

      <span
        role="tooltip"
        className={`sg-tooltip pointer-events-none absolute top-1/2 w-max rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 shadow-card ${
          isIngress ? 'right-full mr-2.5 origin-right' : 'left-full ml-2.5 origin-left'
        } ${isOpen ? 'sg-tooltip-open' : ''}`}
      >
        <span className="block font-sans text-[10px] font-medium tracking-wider text-fg-muted">
          <span className="uppercase">{direction}</span>
          <span className="font-mono normal-case"> · {boundary.rules[0].securityGroup}</span>
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
