import { useCallback } from 'react'
import { useActiveTool } from './useActiveTool'
import { useSimulationStore } from '../store/useSimulationStore'
import type { RdsInstanceLifecycle, RdsInstanceRole } from '../types/node-data'

interface RdsInstanceBlastArgs {
  role: RdsInstanceRole
  lifecycle: RdsInstanceLifecycle
}

export function useRdsInstanceBlast({ role, lifecycle }: RdsInstanceBlastArgs) {
  const activeTool = useActiveTool()
  const killRdsInstance = useSimulationStore((state) => state.killRdsInstance)

  const isTargetable = activeTool.targetsInstances && lifecycle !== 'failed'

  const blast = useCallback(() => {
    if (!isTargetable) return
    killRdsInstance(role)
  }, [isTargetable, killRdsInstance, role])

  return { isTargetable, blast }
}
