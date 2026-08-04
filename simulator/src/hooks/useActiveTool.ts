import { useMemo } from 'react'
import { findTool, type ToolDefinition } from '../canvas/tools'
import { useToolStore } from '../store/useToolStore'

export function useActiveTool(): ToolDefinition {
  const activeToolId = useToolStore((state) => state.activeToolId)
  return useMemo(() => findTool(activeToolId), [activeToolId])
}
