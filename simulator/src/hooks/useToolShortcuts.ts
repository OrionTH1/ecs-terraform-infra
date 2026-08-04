import { useEffect } from 'react'
import { TOOLS } from '../canvas/tools'
import { useToolStore } from '../store/useToolStore'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useToolShortcuts() {
  const setActiveTool = useToolStore((state) => state.setActiveTool)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return

      const tool = TOOLS.find((candidate) => candidate.shortcut === event.key.toLowerCase())
      if (!tool) return

      event.preventDefault()
      setActiveTool(tool.id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTool])
}
