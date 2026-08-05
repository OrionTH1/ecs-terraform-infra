import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { FIT_VIEW_OPTIONS } from '../canvas/initial-graph'
import { useSimulationStore } from '../store/useSimulationStore'

const SETTLE_DURATION_MS = 650

export function useSettleViewport(visibleNodeCount: number) {
  const { fitView } = useReactFlow()
  const isApplyComplete = useSimulationStore((state) => state.isApplyComplete)
  const hasSettled = useRef(false)

  useEffect(() => {
    if (hasSettled.current || visibleNodeCount === 0) return
    if (isApplyComplete) hasSettled.current = true

    fitView({ ...FIT_VIEW_OPTIONS, duration: SETTLE_DURATION_MS })
  }, [visibleNodeCount, isApplyComplete, fitView])
}
