import { useMemo } from 'react'
import { BOOT_GRAPH, RESOURCE_IDS, type ResourceLedger } from '../simulation/boot-graph'
import { useSimulationStore } from '../store/useSimulationStore'

const STILL_CREATING_INTERVAL_MS = 10_000

export type ApplyLineKind = 'creating' | 'progress' | 'complete' | 'summary'

export interface ApplyLine {
  id: string
  kind: ApplyLineKind
  text: string
  atMs: number
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return minutes > 0 ? `${minutes}m${seconds}s` : `${seconds}s`
}

function collectLines(ledger: ResourceLedger, clock: number): ApplyLine[] {
  const lines: ApplyLine[] = []

  for (const id of RESOURCE_IDS) {
    const resource = ledger[id]
    if (resource.status === 'pending') continue

    const address = BOOT_GRAPH[id].terraformAddress
    const startedAt = resource.startedAt ?? 0

    lines.push({ id: `${id}-creating`, kind: 'creating', text: `${address}: Creating...`, atMs: startedAt })

    const lastReportedAt = Math.min(resource.createdAt ?? clock, clock)
    for (
      let elapsed = STILL_CREATING_INTERVAL_MS;
      startedAt + elapsed <= lastReportedAt;
      elapsed += STILL_CREATING_INTERVAL_MS
    ) {
      lines.push({
        id: `${id}-progress-${elapsed}`,
        kind: 'progress',
        text: `${address}: Still creating... [${formatElapsed(elapsed)}]`,
        atMs: startedAt + elapsed,
      })
    }

    if (resource.status === 'created') {
      lines.push({
        id: `${id}-complete`,
        kind: 'complete',
        text: `${address}: Creation complete after ${formatElapsed(BOOT_GRAPH[id].durationMs)}`,
        atMs: resource.createdAt ?? 0,
      })
    }
  }

  return lines.sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id))
}

export function useApplyLog(): ApplyLine[] {
  const resources = useSimulationStore((state) => state.resources)
  const isApplyComplete = useSimulationStore((state) => state.isApplyComplete)
  const clock = useSimulationStore((state) => Math.floor(state.clock / STILL_CREATING_INTERVAL_MS))

  return useMemo(() => {
    const lines = collectLines(resources, clock * STILL_CREATING_INTERVAL_MS)

    if (!isApplyComplete) return lines

    return [
      ...lines,
      {
        id: 'summary',
        kind: 'summary' as const,
        text: `Apply complete! ${RESOURCE_IDS.length} added, 0 changed, 0 destroyed.`,
        atMs: lines.at(-1)?.atMs ?? 0,
      },
    ]
  }, [resources, clock, isApplyComplete])
}
