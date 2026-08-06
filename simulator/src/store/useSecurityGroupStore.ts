import { create } from 'zustand'

interface SecurityGroupState {
  hoveredPairId: string | null
  hoveredKey: string | null
  hoverBoundary: (key: string, pairId: string | null) => void
  clearBoundary: (key: string) => void
}

export const useSecurityGroupStore = create<SecurityGroupState>((set) => ({
  hoveredPairId: null,
  hoveredKey: null,
  hoverBoundary: (key, pairId) => set({ hoveredKey: key, hoveredPairId: pairId }),
  clearBoundary: (key) =>
    set((state) => (state.hoveredKey === key ? { hoveredKey: null, hoveredPairId: null } : state)),
}))
