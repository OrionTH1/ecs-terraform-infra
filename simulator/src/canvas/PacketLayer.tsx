import { useRef } from 'react'
import { useStoreApi } from '@xyflow/react'
import { usePacketFlow, type DirectPacketEntry, type PacketEntry } from '../hooks/usePacketFlow'
import type { ImagePullLegs } from '../simulation/image-pull'
import type { TaskRoute } from '../hooks/useTaskGraph'

interface PacketLayerProps {
  entries: PacketEntry[]
  taskRoutes: TaskRoute[]
  imagePullRoutes: ImagePullLegs[]
  directEntries: DirectPacketEntry[]
  liveEdgeIds: Set<string>
}

export function PacketLayer({ entries, taskRoutes, directEntries, imagePullRoutes, liveEdgeIds }: PacketLayerProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const store = useStoreApi()

  usePacketFlow({ entries, taskRoutes, directEntries, imagePullRoutes, liveEdgeIds, canvas, store })

  return <canvas ref={canvas} className="pointer-events-none absolute inset-0 z-[4] h-full w-full" />
}
