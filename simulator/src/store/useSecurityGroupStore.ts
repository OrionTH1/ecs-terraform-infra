import { create } from 'zustand'

interface SecurityGroupState {
  hoveredPairId: string | null
  hoveredKey: string | null
  hoverBoundary: (key: string, pairId: string | null) => void
  toggleBoundary: (key: string, pairId: string | null) => void
  clearBoundary: (key: string) => void
  clearAllBoundaries: () => void
}

export const useSecurityGroupStore = create<SecurityGroupState>((set) => ({
  hoveredPairId: null,
  hoveredKey: null,
  hoverBoundary: (key, pairId) => set({ hoveredKey: key, hoveredPairId: pairId }),
  toggleBoundary: (key, pairId) =>
    set((state) =>
      state.hoveredKey === key
        ? { hoveredKey: null, hoveredPairId: null }
        : { hoveredKey: key, hoveredPairId: pairId },
    ),
  clearBoundary: (key) =>
    set((state) => (state.hoveredKey === key ? { hoveredKey: null, hoveredPairId: null } : state)),
  clearAllBoundaries: () =>
    set((state) => (state.hoveredKey === null ? state : { hoveredKey: null, hoveredPairId: null })),
}))
