import { ViewportPortal } from '@xyflow/react'
import { usePacketFlow, type DirectPacketEntry, type PacketEntry } from '../hooks/usePacketFlow'
import type { PacketColor } from '../simulation/packets'

interface PacketLayerProps {
  entries: PacketEntry[]
  taskEdgeIds: string[]
  directEntries: DirectPacketEntry[]
  liveEdgeIds: Set<string>
}

const PACKET_COLOR_CLASS: Record<PacketColor, string> = {
  default: 'bg-border-interaction shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]',
  write: 'bg-status-warning shadow-[0_0_8px_2px_rgba(245,158,11,0.4)]',
  blocked: 'bg-status-error shadow-[0_0_8px_2px_rgba(239,68,68,0.45)]',
}

export function PacketLayer({ entries, taskEdgeIds, directEntries, liveEdgeIds }: PacketLayerProps) {
  const packets = usePacketFlow({ entries, taskEdgeIds, directEntries, liveEdgeIds })

  return (
    <ViewportPortal>
      {packets.map((packet) => (
        <div
          key={packet.id}
          className={`pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${PACKET_COLOR_CLASS[packet.color]}`}
          style={{ left: packet.x, top: packet.y }}
        />
      ))}
    </ViewportPortal>
  )
}
