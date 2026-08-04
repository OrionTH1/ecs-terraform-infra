import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { FIT_VIEW_OPTIONS } from '../canvas/initial-graph'

const SETTLE_DURATION_MS = 650

export function useSettleViewport(taskCount: number) {
  const { fitView } = useReactFlow()
  const hasSettled = useRef(false)

  useEffect(() => {
    if (hasSettled.current || taskCount === 0) return
    hasSettled.current = true

    fitView({ ...FIT_VIEW_OPTIONS, duration: SETTLE_DURATION_MS })
  }, [taskCount, fitView])
}
