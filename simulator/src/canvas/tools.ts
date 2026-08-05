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
  targetsInstances: boolean
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'hand',
    label: 'Hand',
    shortcut: 'h',
    description: 'Drag the canvas to pan around the infrastructure',
    icon: HandIcon,
    panOnDrag: true,
    targetsInstances: false,
  },
  {
    id: 'blast',
    label: 'Blast',
    shortcut: 'b',
    description: 'Blow up an ECS task or an RDS instance and watch it get replaced automatically',
    icon: BlastIcon,
    panOnDrag: true,
    targetsInstances: true,
  },
]

export const DEFAULT_TOOL_ID: ToolId = 'hand'

export function findTool(id: ToolId): ToolDefinition {
  return TOOLS.find((tool) => tool.id === id) ?? TOOLS[0]
}
