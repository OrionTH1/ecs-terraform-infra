import { useCallback, useRef, type DragEvent } from 'react'
import { useReactFlow, type NodeChange } from '@xyflow/react'
import { DEFAULT_USER_REQUEST_RATE } from '../simulation/simulation-config'
import type { SimulatorFlowNode } from '../types/node-data'

interface NodePaletteArgs {
  onNodesChange: (changes: NodeChange<SimulatorFlowNode>[]) => void
}

export function useNodePalette({ onNodesChange }: NodePaletteArgs) {
  const { screenToFlowPosition } = useReactFlow()
  const userNodeCount = useRef(0)

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (event.dataTransfer.getData('application/reactflow') !== 'user') return

      userNodeCount.current += 1

      const newNode: SimulatorFlowNode = {
        id: `user-${userNodeCount.current}`,
        type: 'user',
        position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        data: {
          label: 'User',
          tooltip: 'Simulates normal traffic at a fixed request rate, in requests per minute.',
          requestsPerMinute: DEFAULT_USER_REQUEST_RATE,
        },
      }

      onNodesChange([{ type: 'add', item: newNode }])
    },
    [screenToFlowPosition, onNodesChange],
  )

  return { onDragOver, onDrop }
}
