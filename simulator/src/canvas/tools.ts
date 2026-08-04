import type { ComponentType } from 'react'
import { BlastIcon, HandIcon } from '../icons'

export type ToolId = 'hand' | 'blast'

export interface ToolDefinition {
  id: ToolId
  label: string
  shortcut: string
  description: string
  icon: ComponentType<{ className?: string }>
  panOnDrag: boolean
  targetsTasks: boolean
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'hand',
    label: 'Hand',
    shortcut: 'h',
    description: 'Drag the canvas to pan around the infrastructure',
    icon: HandIcon,
    panOnDrag: true,
    targetsTasks: false,
  },
  {
    id: 'blast',
    label: 'Blast',
    shortcut: 'b',
    description: 'Blow up an ECS task and watch the service scheduler replace it',
    icon: BlastIcon,
    panOnDrag: true,
    targetsTasks: true,
  },
]

export const DEFAULT_TOOL_ID: ToolId = 'hand'

export function findTool(id: ToolId): ToolDefinition {
  return TOOLS.find((tool) => tool.id === id) ?? TOOLS[0]
}
