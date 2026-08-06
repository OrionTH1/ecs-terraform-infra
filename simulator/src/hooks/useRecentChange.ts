import { useEffect, useRef, useState } from 'react'

export const DEFAULT_HIGHLIGHT_MS = 700

export function useRecentChange<T>(value: T, durationMs: number = DEFAULT_HIGHLIGHT_MS): boolean {
  const [isRecent, setIsRecent] = useState(false)
  const previous = useRef(value)

  useEffect(() => {
    if (value === previous.current) return
    previous.current = value

    setIsRecent(true)
    const timeoutId = setTimeout(() => setIsRecent(false), durationMs)
    return () => clearTimeout(timeoutId)
  }, [value, durationMs])

  return isRecent
}
