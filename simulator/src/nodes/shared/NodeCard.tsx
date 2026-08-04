import type { ReactNode } from 'react'
import type { NodeStatus } from '../../types/node-data'
import { InfoTooltip } from './InfoTooltip'

interface NodeCardProps {
  variant: 'infra' | 'interaction'
  icon: ReactNode
  title: string
  tooltip: string
  status?: NodeStatus
  animateIn?: boolean
  animateOut?: boolean
  isTargetable?: boolean
  isBlasted?: boolean
  overlay?: ReactNode
  onTargetClick?: () => void
  children?: ReactNode
}

const ENTER_ANIMATION = 'node-enter 340ms cubic-bezier(0.16, 1, 0.3, 1)'
const LEAVE_ANIMATION = 'node-leave 320ms cubic-bezier(0.4, 0, 1, 1) forwards'
const BLAST_ANIMATION = 'node-blast 420ms ease-out'

const statusBorderClass: Record<NodeStatus, string> = {
  idle: 'border-border',
  healthy: 'border-status-healthy',
  warning: 'border-status-warning',
  error: 'border-status-error',
}

export function NodeCard({
  variant,
  icon,
  title,
  tooltip,
  status = 'idle',
  animateIn = false,
  animateOut = false,
  isTargetable = false,
  isBlasted = false,
  overlay,
  onTargetClick,
  children,
}: NodeCardProps) {
  const borderClass =
    status !== 'idle' ? statusBorderClass[status] : variant === 'interaction' ? 'border-border-interaction' : 'border-border'

  return (
    <div
      className={`relative min-w-[170px] overflow-visible rounded-card border bg-surface shadow-card transition-colors duration-300 ${borderClass} ${
        isTargetable ? 'nodrag cursor-crosshair hover:border-status-error hover:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]' : ''
      }`}
      style={
        animateOut
          ? { animation: LEAVE_ANIMATION }
          : isBlasted
            ? { animation: BLAST_ANIMATION }
            : animateIn
              ? { animation: ENTER_ANIMATION }
              : undefined
      }
      onClick={isTargetable ? onTargetClick : undefined}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="inline-flex text-fg-muted">{icon}</span>
        <span className="flex-1 font-sans text-[13px] font-medium text-fg">{title}</span>
        <InfoTooltip text={tooltip} />
      </div>
      {children ? <div className="px-3 py-2.5">{children}</div> : null}
      {overlay}
    </div>
  )
}
