import type { ReactNode } from 'react'
import type { NodeStatus, ProvisioningInfo } from '../../types/node-data'
import { InfoTooltip } from './InfoTooltip'
import { StageProgress } from './StageProgress'
import { RemoveIcon } from '../../icons'

interface NodeCardProps {
  variant: 'infra' | 'interaction'
  icon: ReactNode
  title: ReactNode
  tooltip: string
  headerAction?: ReactNode
  status?: NodeStatus
  provisioning?: ProvisioningInfo | null
  isProvisional?: boolean
  animateIn?: boolean
  animateOut?: boolean
  isTargetable?: boolean
  isBlasted?: boolean
  overlay?: ReactNode
  onTargetClick?: () => void
  onRemove?: () => void
  removeLabel?: string
  handles?: ReactNode
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
  headerAction,
  status = 'idle',
  provisioning = null,
  isProvisional = false,
  animateIn = false,
  animateOut = false,
  isTargetable = false,
  isBlasted = false,
  overlay,
  onTargetClick,
  onRemove,
  removeLabel = 'Remove node',
  handles,
  children,
}: NodeCardProps) {
  const borderClass =
    status !== 'idle' ? statusBorderClass[status] : variant === 'interaction' ? 'border-border-interaction' : 'border-border'

  return (
    <div
      className={`group/card relative min-w-[170px] overflow-visible rounded-card border bg-surface shadow-card transition-colors duration-300 ${borderClass} ${
        isProvisional || provisioning ? 'border-dashed' : ''
      } ${
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
      {handles}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="inline-flex text-fg-muted">{icon}</span>
        <span className="flex-1 font-sans text-[13px] font-medium text-fg">{title}</span>
        {headerAction}
        <InfoTooltip text={tooltip} />
      </div>
      {provisioning ? (
        <div className="px-3 py-2.5">
          <div className="flex w-[186px] flex-col gap-1.5">
            <span className="font-sans text-xs font-medium text-fg">{provisioning.label ?? 'Creating'}</span>
            <StageProgress durationMs={provisioning.durationMs} startedAt={provisioning.startedAt} tone="creating" />
            <span className="truncate font-mono text-[11px] text-fg-muted">{provisioning.detail}</span>
          </div>
        </div>
      ) : children ? (
        <div className="px-3 py-2.5">{children}</div>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          title={removeLabel}
          aria-label={removeLabel}
          className="nodrag absolute -top-2.5 -right-2.5 z-10 inline-flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-fg-muted opacity-0 shadow-card transition-[opacity,color,border-color] duration-150 hover:border-status-error hover:text-status-error focus-visible:opacity-100 group-hover/card:opacity-100"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <RemoveIcon />
        </button>
      ) : null}
      {overlay}
    </div>
  )
}
