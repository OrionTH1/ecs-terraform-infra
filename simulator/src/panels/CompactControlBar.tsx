import { useState } from 'react'
import { ChevronIcon } from '../icons'
import { ComponentsPanel } from './ComponentsPanel'
import { SpeedPanel } from './SpeedPanel'
import { Toolbar } from './Toolbar'
import type { TrafficNodeType } from '../canvas/traffic-nodes'

type CompactSection = 'components' | 'speed'

interface CompactControlBarProps {
  onAddNode: (nodeType: TrafficNodeType) => void
}

const SECTIONS: { id: CompactSection; label: string }[] = [
  { id: 'components', label: 'Components' },
  { id: 'speed', label: 'Speed' },
]

export function CompactControlBar({ onAddNode }: CompactControlBarProps) {
  const [openSection, setOpenSection] = useState<CompactSection | null>(null)

  const toggle = (section: CompactSection) => setOpenSection((current) => (current === section ? null : section))

  const addAndClose = (nodeType: TrafficNodeType) => {
    onAddNode(nodeType)
    setOpenSection(null)
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {openSection === 'components' ? <ComponentsPanel onSelect={addAndClose} /> : null}
      {openSection === 'speed' ? <SpeedPanel /> : null}

      <div className="flex items-center gap-2">
        <Toolbar />

        <div className="flex flex-1 gap-1 rounded-card border border-border bg-surface p-1 shadow-card">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-expanded={openSection === section.id}
              onClick={() => toggle(section.id)}
              className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2 font-sans text-[11px] font-medium uppercase tracking-wider press-ack ${
                openSection === section.id ? 'bg-surface-raised text-fg' : 'text-fg-muted'
              }`}
            >
              {section.label}
              <span className={`inline-flex transition-transform duration-200 ${openSection === section.id ? '' : 'rotate-180'}`}>
                <ChevronIcon />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
