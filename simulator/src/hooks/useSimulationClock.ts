import { useEffect } from 'react'
import { useSimulationStore } from '../store/useSimulationStore'

const TICK_MS = 250

export function useSimulationClock() {
  const tick = useSimulationStore((state) => state.tick)

  useEffect(() => {
    let previous = performance.now()

    const intervalId = setInterval(() => {
      const now = performance.now()
      tick(now - previous)
      previous = now
    }, TICK_MS)

    return () => clearInterval(intervalId)
  }, [tick])
}
