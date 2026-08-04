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
  children?: ReactNode
}

const ENTER_ANIMATION = 'node-enter 340ms cubic-bezier(0.16, 1, 0.3, 1)'

const statusBorderClass: Record<NodeStatus, string> = {
  idle: 'border-border',
  healthy: 'border-status-healthy',
  warning: 'border-status-warning',
  error: 'border-status-error',
}

export function NodeCard({ variant, icon, title, tooltip, status = 'idle', animateIn = false, children }: NodeCardProps) {
  const borderClass =
    status !== 'idle' ? statusBorderClass[status] : variant === 'interaction' ? 'border-border-interaction' : 'border-border'

  return (
    <div
      className={`min-w-[170px] overflow-visible rounded-card border bg-surface shadow-card transition-colors duration-300 ${borderClass}`}
      style={animateIn ? { animation: ENTER_ANIMATION } : undefined}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="inline-flex text-fg-muted">{icon}</span>
        <span className="flex-1 font-sans text-[13px] font-medium text-fg">{title}</span>
        <InfoTooltip text={tooltip} />
      </div>
      {children ? <div className="px-3 py-2.5">{children}</div> : null}
    </div>
  )
}
