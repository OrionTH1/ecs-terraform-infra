import { Boxes, ChevronDown, Container, Hand, Network, User, type LucideIcon } from 'lucide-react'

const STROKE_WIDTH = 1.75

export interface IconProps {
  className?: string
}

interface GlyphProps extends IconProps {
  icon: LucideIcon
  size: number
}

function Glyph({ icon: Icon, size, className }: GlyphProps) {
  return <Icon size={size} strokeWidth={STROKE_WIDTH} absoluteStrokeWidth className={className} />
}

export function LoadBalancerIcon({ className }: IconProps) {
  return <Glyph icon={Network} size={16} className={className} />
}

export function EcsServiceIcon({ className }: IconProps) {
  return <Glyph icon={Boxes} size={16} className={className} />
}

export function TaskIcon({ className }: IconProps) {
  return <Glyph icon={Container} size={16} className={className} />
}

export function UserIcon({ className }: IconProps) {
  return <Glyph icon={User} size={16} className={className} />
}

export function ChevronIcon({ className }: IconProps) {
  return <Glyph icon={ChevronDown} size={13} className={className} />
}

export function HandIcon({ className }: IconProps) {
  return <Glyph icon={Hand} size={18} className={className} />
}
