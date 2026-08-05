import { useIsCompactViewport } from '../hooks/useMediaQuery'
import { CompactControlBar } from './CompactControlBar'
import { ComponentsPanel } from './ComponentsPanel'
import { SpeedPanel } from './SpeedPanel'
import { Toolbar } from './Toolbar'
import type { TrafficNodeType } from '../canvas/traffic-nodes'

interface CanvasControlsProps {
  onAddNode: (nodeType: TrafficNodeType) => void
}

export function CanvasControls({ onAddNode }: CanvasControlsProps) {
  const isCompact = useIsCompactViewport()

  if (isCompact) return <CompactControlBar onAddNode={onAddNode} />

  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex w-[196px] flex-col gap-3">
        <ComponentsPanel onSelect={onAddNode} />
        <SpeedPanel />
      </div>
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <Toolbar />
      </div>
    </>
  )
}
