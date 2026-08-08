import { useStore } from '@xyflow/react'
import { useSecurityGroupStore } from '../store/useSecurityGroupStore'

const GAP_FROM_ANCHOR = 12
const MIN_SCALE = 0.55
const MAX_SCALE = 1.35

export function BoundaryTooltip() {
  const zoom = useStore((state) => state.transform[2])
  const anchor = useSecurityGroupStore((state) => state.hoveredAnchor)
  const content = useSecurityGroupStore((state) => state.hoveredContent)
  if (anchor === null || content === null) return null

  const opensLeft = content.side === 'left'
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoom))

  return (
    <div
      className="pointer-events-none fixed z-[5]"
      style={{
        top: anchor.top + anchor.height / 2,
        left: opensLeft ? anchor.left - GAP_FROM_ANCHOR : anchor.right + GAP_FROM_ANCHOR,
        transform: `scale(${scale})`,
        transformOrigin: 'left top',
      }}
    >
      <div
        role="tooltip"
        className={`w-max rounded-lg border border-border bg-surface-raised px-3 py-2.5 shadow-card ${
          opensLeft ? 'sg-card-ingress' : 'sg-card-egress'
        }`}
      >
        <span className="block font-sans text-[11px] font-semibold uppercase tracking-wider text-fg">
          {content.title}
        </span>
        {content.subtitle === undefined ? null : (
          <span className="mt-1 block font-mono text-[11px] text-fg-muted">{content.subtitle}</span>
        )}
        {content.lines.map((line) => (
          <span key={line} className="mt-1 block font-mono text-[13px] text-fg">
            {line}
          </span>
        ))}
      </div>
    </div>
  )
}
