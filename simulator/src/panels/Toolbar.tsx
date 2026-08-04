import { TOOLS } from '../canvas/tools'
import { useToolStore } from '../store/useToolStore'
import { ToolbarButton } from './ToolbarButton'

export function Toolbar() {
  const activeToolId = useToolStore((state) => state.activeToolId)
  const setActiveTool = useToolStore((state) => state.setActiveTool)

  return (
    <div
      role="toolbar"
      aria-label="Canvas tools"
      aria-orientation="horizontal"
      className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-card border border-border bg-surface p-1 shadow-card"
    >
      {TOOLS.map((tool) => (
        <ToolbarButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          description={tool.description}
          isActive={tool.id === activeToolId}
          onSelect={() => setActiveTool(tool.id)}
        />
      ))}
    </div>
  )
}
