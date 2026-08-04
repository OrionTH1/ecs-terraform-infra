import { create } from 'zustand'
import { DEFAULT_TOOL_ID, type ToolId } from '../canvas/tools'

interface ToolState {
  activeToolId: ToolId
  setActiveTool: (toolId: ToolId) => void
}

export const useToolStore = create<ToolState>((set) => ({
  activeToolId: DEFAULT_TOOL_ID,
  setActiveTool: (toolId) => set({ activeToolId: toolId }),
}))
