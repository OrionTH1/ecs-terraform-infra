import { UserIcon } from '../icons'
import { ComponentPaletteItem } from './ComponentPaletteItem'

const PALETTE_ITEMS = [{ nodeType: 'user', label: 'User', icon: <UserIcon /> }]

export function ComponentsPanel() {
  return (
    <div className="rounded-card border border-border bg-surface p-2.5 shadow-card">
      <span className="block px-2.5 pb-2.5 pt-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
        Components
      </span>
      {PALETTE_ITEMS.map((item) => (
        <ComponentPaletteItem key={item.nodeType} nodeType={item.nodeType} label={item.label} icon={item.icon} />
      ))}
    </div>
  )
}
