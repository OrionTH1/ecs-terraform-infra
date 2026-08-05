import { UserGroupIcon, UserIcon } from '../icons'
import { isCreated } from '../simulation/boot-graph'
import { useSimulationStore } from '../store/useSimulationStore'
import { ComponentPaletteItem } from './ComponentPaletteItem'
import type { TrafficNodeType } from '../canvas/traffic-nodes'

interface ComponentsPanelProps {
  onSelect: (nodeType: TrafficNodeType) => void
}

const PALETTE_ITEMS: { nodeType: TrafficNodeType; label: string; icon: React.ReactNode }[] = [
  { nodeType: 'user', label: 'User', icon: <UserIcon /> },
  { nodeType: 'userGroup', label: 'Group of Users', icon: <UserGroupIcon /> },
]

const WAITING_FOR_ALB =
  'Waiting for the load balancer — it is the only public entry point, so there is nowhere to send traffic yet.'

export function ComponentsPanel({ onSelect }: ComponentsPanelProps) {
  const isAlbReady = useSimulationStore((state) => isCreated(state.resources, 'alb'))

  return (
    <div className="rounded-card border border-border bg-surface p-2.5 shadow-card">
      <span className="block px-2.5 pb-2.5 pt-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
        Components
      </span>
      {PALETTE_ITEMS.map((item) => (
        <ComponentPaletteItem
          key={item.nodeType}
          nodeType={item.nodeType}
          label={item.label}
          icon={item.icon}
          isDisabled={!isAlbReady}
          disabledReason={WAITING_FOR_ALB}
          onSelect={() => onSelect(item.nodeType)}
        />
      ))}
    </div>
  )
}
