import type { ReactNode, DragEvent } from 'react'

interface ComponentPaletteItemProps {
  nodeType: string
  label: string
  icon: ReactNode
}

export function ComponentPaletteItem({ nodeType, label, icon }: ComponentPaletteItemProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="flex cursor-grab items-center gap-2 rounded-lg px-2.5 py-2 text-fg transition-colors duration-150 hover:bg-surface-raised"
      draggable
      onDragStart={handleDragStart}
    >
      <span className="inline-flex text-border-interaction">{icon}</span>
      <span className="font-sans text-[13px] font-normal">{label}</span>
    </div>
  )
}
