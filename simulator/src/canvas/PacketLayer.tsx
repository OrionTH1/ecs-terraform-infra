import { ViewportPortal } from '@xyflow/react'
import { usePacketFlow, type PacketEntry } from '../hooks/usePacketFlow'

interface PacketLayerProps {
  entries: PacketEntry[]
  taskEdgeIds: string[]
}

export function PacketLayer({ entries, taskEdgeIds }: PacketLayerProps) {
  const packets = usePacketFlow({ entries, taskEdgeIds })

  return (
    <ViewportPortal>
      {packets.map((packet) => (
        <div
          key={packet.id}
          className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-border-interaction shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]"
          style={{ left: packet.x, top: packet.y }}
        />
      ))}
    </ViewportPortal>
  )
}
