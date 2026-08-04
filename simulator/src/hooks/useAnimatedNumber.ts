import { useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 480

export function useAnimatedNumber(value: number, durationMs = DEFAULT_DURATION_MS): number {
  const [display, setDisplay] = useState(value)
  const displayed = useRef(value)

  useEffect(() => {
    const from = displayed.current
    const delta = value - from
    if (delta === 0) return

    const startedAt = performance.now()
    let frameId = 0

    function step(now: number) {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      const eased = 1 - (1 - progress) ** 3
      const next = Math.round(from + delta * eased)

      displayed.current = next
      setDisplay(next)

      if (progress < 1) frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, durationMs])

  return display
}
