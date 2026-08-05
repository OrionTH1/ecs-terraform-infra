import { useCallback, useRef, type DragEvent } from 'react'
import { useReactFlow, type NodeChange } from '@xyflow/react'
import { createTrafficNode, isTrafficNodeType, type TrafficNodeType } from '../canvas/traffic-nodes'
import { useSimulationStore } from '../store/useSimulationStore'
import type { SimulatorFlowNode } from '../types/node-data'

interface NodePaletteArgs {
  nodes: SimulatorFlowNode[]
  onNodesChange: (changes: NodeChange<SimulatorFlowNode>[]) => void
}

const DROP_TRANSFER_TYPE = 'application/reactflow'

export function useNodePalette({ nodes, onNodesChange }: NodePaletteArgs) {
  const { screenToFlowPosition } = useReactFlow()
  const nodeCount = useRef(0)

  const addNode = useCallback(
    (nodeType: TrafficNodeType, position: { x: number; y: number }) => {
      nodeCount.current += 1

      const node = createTrafficNode({
        nodeType,
        id: `${nodeType}-${nodeCount.current}`,
        position,
        existingNodes: nodes,
        clock: useSimulationStore.getState().clock,
      })

      onNodesChange([{ type: 'add', item: node }])
    },
    [nodes, onNodesChange],
  )

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData(DROP_TRANSFER_TYPE)
      if (!isTrafficNodeType(nodeType)) return

      addNode(nodeType, screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    },
    [addNode, screenToFlowPosition],
  )

  const addNodeAtViewportCenter = useCallback(
    (nodeType: TrafficNodeType) => {
      addNode(nodeType, screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
    },
    [addNode, screenToFlowPosition],
  )

  return { onDragOver, onDrop, addNodeAtViewportCenter }
}
