import { useEffect } from 'react'
import { SIMULATION_START_DELAY_MS } from '../simulation/simulation-config'
import { useSimulationStore } from '../store/useSimulationStore'

const TICK_MS = 250

export function useSimulationClock() {
  const tick = useSimulationStore((state) => state.tick)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    const timeoutId = setTimeout(() => {
      let previous = performance.now()
      intervalId = setInterval(() => {
        const now = performance.now()
        tick(now - previous)
        previous = now
      }, TICK_MS)
    }, SIMULATION_START_DELAY_MS)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId !== undefined) clearInterval(intervalId)
    }
  }, [tick])
}
