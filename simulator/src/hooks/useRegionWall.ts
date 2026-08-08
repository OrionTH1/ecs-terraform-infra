import { useCallback, useRef, useState } from 'react'
import { REGION_NODE_ID } from '../canvas/initial-graph'
import { frameContentBox } from '../canvas/frame-metrics'
import { positionOutside, pushedOutside } from '../canvas/region-wall'
import { useRecentChange } from './useRecentChange'
import type { NetworkZoneLayout } from './useNetworkZoneLayout'
import type { NodeChange, XYPosition } from '@xyflow/react'
import type { SimulatorFlowNode } from '../types/node-data'

const WALLED_OUT_TYPES = new Set(['user', 'userGroup'])
const NEW_NODE_SIZE = { width: 240, height: 150 }
const REPEL_HIGHLIGHT_MS = 500
const REPEL_THROTTLE_MS = 200

interface RegionWallArgs {
  nodes: SimulatorFlowNode[]
  networkZones: NetworkZoneLayout
  onNodesChange: (changes: NodeChange<SimulatorFlowNode>[]) => void
}

export function useRegionWall({ nodes, networkZones, onNodesChange }: RegionWallArgs) {
  const [repelledAt, setRepelledAt] = useState(0)
  const lastRepelAt = useRef(0)
  const isRepelling = useRecentChange(repelledAt, REPEL_HIGHLIGHT_MS)

  const onNodesChangeOutsideTheRegion = useCallback(
    (changes: NodeChange<SimulatorFlowNode>[]) => {
      const region = networkZones.framesByNodeId.get(REGION_NODE_ID)
      if (region === undefined) return onNodesChange(changes)

      const wall = frameContentBox(region)
      let hasHitTheWall = false

      onNodesChange(
        changes.map((change) => {
          if (change.type === 'add') {
            if (!WALLED_OUT_TYPES.has(change.item.type ?? '')) return change

            const position = pushedOutside(change.item.position, NEW_NODE_SIZE, wall)
            if (position === change.item.position) return change

            hasHitTheWall = true
            return { ...change, item: { ...change.item, position } }
          }

          if (change.type !== 'position' || change.position === undefined) return change

          const node = nodes.find((entry) => entry.id === change.id)
          if (node === undefined || !WALLED_OUT_TYPES.has(node.type ?? '')) return change
          if (node.measured?.width === undefined || node.measured.height === undefined) return change

          const position: XYPosition = positionOutside(
            change.position,
            node.position,
            { width: node.measured.width, height: node.measured.height },
            wall,
          )

          if (position.x !== change.position.x || position.y !== change.position.y) hasHitTheWall = true

          return { ...change, position }
        }),
      )

      if (!hasHitTheWall) return

      const now = Date.now()
      if (now - lastRepelAt.current < REPEL_THROTTLE_MS) return

      lastRepelAt.current = now
      setRepelledAt(now)
    },
    [nodes, networkZones, onNodesChange],
  )

  return { onNodesChangeOutsideTheRegion, isRepelling }
}
