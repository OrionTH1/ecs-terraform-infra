import { create } from 'zustand'

interface SecurityGroupState {
  hoveredPairId: string | null
  hoveredKey: string | null
  hoveredNodeId: string | null
  hoverBoundary: (key: string, nodeId: string, pairId: string | null) => void
  toggleBoundary: (key: string, nodeId: string, pairId: string | null) => void
  clearBoundary: (key: string) => void
  clearAllBoundaries: () => void
}

export const useSecurityGroupStore = create<SecurityGroupState>((set) => ({
  hoveredPairId: null,
  hoveredKey: null,
  hoveredNodeId: null,
  hoverBoundary: (key, nodeId, pairId) =>
    set({ hoveredKey: key, hoveredNodeId: nodeId, hoveredPairId: pairId }),
  toggleBoundary: (key, nodeId, pairId) =>
    set((state) =>
      state.hoveredKey === key
        ? { hoveredKey: null, hoveredNodeId: null, hoveredPairId: null }
        : { hoveredKey: key, hoveredNodeId: nodeId, hoveredPairId: pairId },
    ),
  clearBoundary: (key) =>
    set((state) =>
      state.hoveredKey === key ? { hoveredKey: null, hoveredNodeId: null, hoveredPairId: null } : state,
    ),
  clearAllBoundaries: () =>
    set((state) =>
      state.hoveredKey === null ? state : { hoveredKey: null, hoveredNodeId: null, hoveredPairId: null },
    ),
}))
