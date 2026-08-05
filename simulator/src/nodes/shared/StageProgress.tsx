import { useMemo } from 'react'
import { useSimulationStore } from '../../store/useSimulationStore'

export type StageTone = 'warning' | 'error' | 'creating'

interface StageProgressProps {
  durationMs: number | null
  startedAt: number
  tone: StageTone
}

const TONE_BAR_CLASS: Record<StageTone, string> = {
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  creating: 'bg-border-interaction',
}

export function StageProgress({ durationMs, startedAt, tone }: StageProgressProps) {
  const timeScale = useSimulationStore((state) => state.timeScale)

  const style = useMemo(() => {
    if (durationMs === null) return { width: 0 }

    const elapsedMs = Math.min(Math.max(useSimulationStore.getState().clock - startedAt, 0), durationMs)

    return {
      animation: `stage-progress ${durationMs / timeScale}ms linear forwards`,
      animationDelay: `-${elapsedMs / timeScale}ms`,
    }
  }, [durationMs, timeScale, startedAt])

  if (durationMs === null) return <div className="h-[3px] w-full" />

  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-raised">
      <div key={`${startedAt}-${durationMs}-${timeScale}`} className={`h-full ${TONE_BAR_CLASS[tone]}`} style={style} />
    </div>
  )
}
