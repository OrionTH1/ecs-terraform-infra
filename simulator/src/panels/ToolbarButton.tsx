import type { ComponentType } from 'react'

interface ToolbarButtonProps {
  icon: ComponentType<{ className?: string }>
  label: string
  shortcut: string
  description: string
  isActive: boolean
  onSelect: () => void
}

export function ToolbarButton({ icon: Icon, label, shortcut, description, isActive, onSelect }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-keyshortcuts={shortcut}
      aria-label={`${label} (${shortcut.toUpperCase()})`}
      title={`${label} (${shortcut.toUpperCase()}) — ${description}`}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md press-ack ${
        isActive ? 'bg-border-interaction text-fg' : 'text-fg-muted hover:bg-surface-raised hover:text-fg'
      }`}
    >
      <Icon />
    </button>
  )
}
