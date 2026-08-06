import type { ReactNode, DragEvent } from 'react'

interface ComponentPaletteItemProps {
  nodeType: string
  label: string
  icon: ReactNode
  isDisabled?: boolean
  disabledReason?: string
  onSelect: () => void
}

export function ComponentPaletteItem({
  nodeType,
  label,
  icon,
  isDisabled = false,
  disabledReason,
  onSelect,
}: ComponentPaletteItemProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <button
      type="button"
      title={isDisabled ? disabledReason : `Add a ${label} to the canvas`}
      disabled={isDisabled}
      className={`flex w-full min-h-[44px] items-center gap-2 rounded-lg px-2.5 py-2 text-left press-ack ${
        isDisabled
          ? 'cursor-not-allowed text-fg-muted opacity-50'
          : 'cursor-pointer text-fg hover:bg-surface-raised active:bg-surface-raised md:cursor-grab'
      }`}
      draggable={!isDisabled}
      onDragStart={handleDragStart}
      onClick={onSelect}
    >
      <span className={`inline-flex ${isDisabled ? 'text-fg-muted' : 'text-border-interaction'}`}>{icon}</span>
      <span className="font-sans text-[13px] font-normal">{label}</span>
    </button>
  )
}
