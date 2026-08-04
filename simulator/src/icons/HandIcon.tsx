interface HandIconProps {
  className?: string
}

export function HandIcon({ className }: HandIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path
        d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L5 14.6a1.5 1.5 0 0 1 2.2-2l1.8 1.7V8.5a1.5 1.5 0 0 1 3 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
