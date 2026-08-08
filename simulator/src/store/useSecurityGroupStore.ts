import { create } from 'zustand'
export interface TooltipContent {
  title: string
  subtitle?: string
  lines: string[]
  side: 'left' | 'right'
}

export interface BoundaryAnchor {
  top: number
  left: number
  right: number
  height: number
}

interface SecurityGroupState {
  hoveredPairId: string | null
  hoveredKey: string | null
  hoveredNodeId: string | null
  hoveredAnchor: BoundaryAnchor | null
  hoveredContent: TooltipContent | null
  hoverBoundary: (
    key: string,
    nodeId: string,
    pairId: string | null,
    anchor: BoundaryAnchor,
    content: TooltipContent,
  ) => void
  toggleBoundary: (
    key: string,
    nodeId: string,
    pairId: string | null,
    anchor: BoundaryAnchor,
    content: TooltipContent,
  ) => void
  clearBoundary: (key: string) => void
  clearAllBoundaries: () => void
}

const CLOSED = {
  hoveredKey: null,
  hoveredNodeId: null,
  hoveredPairId: null,
  hoveredAnchor: null,
  hoveredContent: null,
}

export const useSecurityGroupStore = create<SecurityGroupState>((set) => ({
  hoveredPairId: null,
  hoveredKey: null,
  hoveredNodeId: null,
  hoveredAnchor: null,
  hoveredContent: null,
  hoverBoundary: (key, nodeId, pairId, anchor, content) =>
    set({ hoveredKey: key, hoveredNodeId: nodeId, hoveredPairId: pairId, hoveredAnchor: anchor, hoveredContent: content }),
  toggleBoundary: (key, nodeId, pairId, anchor, content) =>
    set((state) =>
      state.hoveredKey === key
        ? CLOSED
        : {
            hoveredKey: key,
            hoveredNodeId: nodeId,
            hoveredPairId: pairId,
            hoveredAnchor: anchor,
            hoveredContent: content,
          },
    ),
  clearBoundary: (key) => set((state) => (state.hoveredKey === key ? CLOSED : state)),
  clearAllBoundaries: () => set((state) => (state.hoveredKey === null ? state : CLOSED)),
}))
