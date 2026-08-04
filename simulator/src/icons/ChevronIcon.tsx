interface ChevronIconProps {
  className?: string
}

export function ChevronIcon({ className }: ChevronIconProps) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 6.5 8 10.5 12 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
