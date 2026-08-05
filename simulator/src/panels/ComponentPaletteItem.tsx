import type { ReactNode, DragEvent } from 'react'

interface ComponentPaletteItemProps {
  nodeType: string
  label: string
  icon: ReactNode
  isDisabled?: boolean
  disabledReason?: string
}

export function ComponentPaletteItem({
  nodeType,
  label,
  icon,
  isDisabled = false,
  disabledReason,
}: ComponentPaletteItemProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      title={isDisabled ? disabledReason : undefined}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors duration-150 ${
        isDisabled ? 'cursor-not-allowed text-fg-muted opacity-50' : 'cursor-grab text-fg hover:bg-surface-raised'
      }`}
      draggable={!isDisabled}
      onDragStart={handleDragStart}
    >
      <span className={`inline-flex ${isDisabled ? 'text-fg-muted' : 'text-border-interaction'}`}>{icon}</span>
      <span className="font-sans text-[13px] font-normal">{label}</span>
    </div>
  )
}
