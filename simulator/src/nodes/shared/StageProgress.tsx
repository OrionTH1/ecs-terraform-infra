import { useMemo } from 'react'
import { STAGE_DURATION_MS } from '../../simulation/simulation-config'
import { useSimulationStore } from '../../store/useSimulationStore'
import type { TaskStatus } from '../../types/task-data'

interface StageProgressProps {
  status: TaskStatus
  stageEnteredAt: number
}

const STAGE_BAR_CLASS: Record<TaskStatus, string> = {
  provisioning: 'bg-status-warning',
  starting: 'bg-status-warning',
  registering: 'bg-status-warning',
  healthy: '',
  draining: 'bg-status-error',
}

export function StageProgress({ status, stageEnteredAt }: StageProgressProps) {
  const timeScale = useSimulationStore((state) => state.timeScale)
  const hasStarted = useSimulationStore((state) => state.hasStarted)
  const stageDurationMs = STAGE_DURATION_MS[status]

  const style = useMemo(() => {
    if (stageDurationMs === null || !hasStarted) return { width: 0 }

    const elapsedMs = Math.min(Math.max(useSimulationStore.getState().clock - stageEnteredAt, 0), stageDurationMs)

    return {
      animation: `stage-progress ${stageDurationMs / timeScale}ms linear forwards`,
      animationDelay: `-${elapsedMs / timeScale}ms`,
    }
  }, [stageDurationMs, hasStarted, timeScale, stageEnteredAt])

  if (stageDurationMs === null) return <div className="h-[3px] w-full" />

  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-raised">
      <div key={`${status}-${timeScale}-${hasStarted}`} className={`h-full ${STAGE_BAR_CLASS[status]}`} style={style} />
    </div>
  )
}
