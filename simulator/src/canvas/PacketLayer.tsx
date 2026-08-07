import { useRef } from 'react'
import { ViewportPortal } from '@xyflow/react'
import { usePacketFlow, type DirectPacketEntry, type PacketEntry } from '../hooks/usePacketFlow'
import type { TaskRoute } from '../hooks/useTaskGraph'
import { MAX_LIVE_PACKETS, PACKET_BASE_CLASS } from '../simulation/packets'

interface PacketLayerProps {
  entries: PacketEntry[]
  taskRoutes: TaskRoute[]
  directEntries: DirectPacketEntry[]
  liveEdgeIds: Set<string>
}

export function PacketLayer({ entries, taskRoutes, directEntries, liveEdgeIds }: PacketLayerProps) {
  const slots = useRef<(HTMLDivElement | null)[]>([])

  usePacketFlow({ entries, taskRoutes, directEntries, liveEdgeIds, slots })

  return (
    <ViewportPortal>
      {Array.from({ length: MAX_LIVE_PACKETS }, (_, slot) => (
        <div
          key={slot}
          ref={(element) => {
            slots.current[slot] = element
          }}
          className={PACKET_BASE_CLASS}
          style={{ visibility: 'hidden' }}
        />
      ))}
    </ViewportPortal>
  )
}
