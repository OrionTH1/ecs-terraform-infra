import type { ReactNode } from 'react'
import { FRAME_HEADER_HEIGHT, FRAME_HEADER_INSET } from '../../canvas/frame-metrics'
import { InfoTooltip } from './InfoTooltip'

export type FrameTone = 'membership' | 'ownership' | 'perimeter' | 'region' | 'error'

interface NodeFrameProps {
  label: string
  tooltip: string
  width: number
  height: number
  tone?: FrameTone
  isRepelling?: boolean
  icon?: ReactNode
  summary?: ReactNode
  handles?: ReactNode
}

const TONE_CLASS: Record<FrameTone, string> = {
  membership: 'border-dashed border-border-interaction/45 bg-[rgba(59,130,246,0.04)]',
  ownership: 'border-solid border-border/40 bg-[rgba(148,163,184,0.04)]',
  perimeter: 'border-solid border-border/85 bg-[rgba(148,163,184,0.05)]',
  region: 'border-solid border-border/25 bg-[rgba(148,163,184,0.02)]',
  error: 'border-dashed border-status-error/60 bg-[rgba(239,68,68,0.04)]',
}

const REPELLING_CLASS = 'border-solid border-border-interaction bg-[rgba(59,130,246,0.03)]'

const HALO_AT_REST = '0 0 0 0 rgba(59, 130, 246, 0)'
const HALO_ON_CONTACT = '0 0 0 5px rgba(59, 130, 246, 0.12)'

export function NodeFrame({
  label,
  tooltip,
  width,
  height,
  tone = 'membership',
  isRepelling = false,
  icon,
  summary,
  handles,
}: NodeFrameProps) {
  return (
    <div
      className={`node-materialize pointer-events-none rounded-card border transition-[width,height,border-color,background-color,box-shadow] ${
        isRepelling ? REPELLING_CLASS : TONE_CLASS[tone]
      }`}
      style={{
        width,
        height,
        boxShadow: isRepelling ? HALO_ON_CONTACT : HALO_AT_REST,
        transitionDuration: isRepelling ? 'var(--motion-state)' : 'var(--motion-settle)',
        transitionTimingFunction: 'var(--ease-converge)',
      }}
    >
      {handles}
      <div
        className="pointer-events-auto flex items-center gap-1.5"
        style={{ height: FRAME_HEADER_HEIGHT, paddingInline: FRAME_HEADER_INSET }}
      >
        {icon ? <span className="inline-flex shrink-0 text-fg-muted">{icon}</span> : null}
        <span className="shrink-0 whitespace-nowrap font-sans text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        {summary}
        <InfoTooltip text={tooltip} />
      </div>
    </div>
  )
}

interface FrameSummaryProps {
  tone?: 'muted' | 'error'
  children: ReactNode
}

export function FrameSummary({ tone = 'muted', children }: FrameSummaryProps) {
  return (
    <span
      className={`flex-1 truncate whitespace-nowrap font-mono text-[10px] tabular-nums transition-colors duration-300 ${
        tone === 'error' ? 'text-status-error' : 'text-fg-muted'
      }`}
    >
      {children}
    </span>
  )
}
