import { STAGE_DURATION_MS } from '../../simulation/simulation-config'
import { useSimulationStore } from '../../store/useSimulationStore'
import type { TaskStatus } from '../../types/task-data'

interface StageProgressProps {
  status: TaskStatus
}

const STAGE_BAR_CLASS: Record<TaskStatus, string> = {
  provisioning: 'bg-status-warning',
  starting: 'bg-status-warning',
  registering: 'bg-status-warning',
  healthy: '',
  draining: 'bg-status-error',
}

export function StageProgress({ status }: StageProgressProps) {
  const timeScale = useSimulationStore((state) => state.timeScale)
  const stageDurationMs = STAGE_DURATION_MS[status]

  if (stageDurationMs === null) return <div className="h-[3px] w-full" />

  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-raised">
      <div
        key={status}
        className={`h-full ${STAGE_BAR_CLASS[status]}`}
        style={{ animation: `stage-progress ${stageDurationMs / timeScale}ms linear forwards` }}
      />
    </div>
  )
}
