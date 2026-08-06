import type { ReactNode } from 'react'
import { FRAME_HEADER_HEIGHT, FRAME_HEADER_INSET } from '../../canvas/frame-metrics'
import { InfoTooltip } from './InfoTooltip'

export type FrameTone = 'membership' | 'ownership' | 'error'

interface NodeFrameProps {
  label: string
  tooltip: string
  width: number
  height: number
  tone?: FrameTone
  icon?: ReactNode
  summary?: ReactNode
  handles?: ReactNode
}

const TONE_CLASS: Record<FrameTone, string> = {
  membership: 'border-dashed border-border-interaction/45 bg-[rgba(59,130,246,0.04)]',
  ownership: 'border-solid border-border/70 bg-[rgba(148,163,184,0.05)]',
  error: 'border-dashed border-status-error/60 bg-[rgba(239,68,68,0.04)]',
}

export function NodeFrame({
  label,
  tooltip,
  width,
  height,
  tone = 'membership',
  icon,
  summary,
  handles,
}: NodeFrameProps) {
  return (
    <div
      className={`node-materialize pointer-events-none rounded-card border transition-[width,height,border-color,background-color] ${TONE_CLASS[tone]}`}
      style={{ width, height, transitionDuration: 'var(--motion-settle)', transitionTimingFunction: 'var(--ease-converge)' }}
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
