interface InfoTooltipProps {
  text: string
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span
      className="group relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-fg-muted"
      tabIndex={0}
      aria-label={text}
    >
      <span className="font-sans text-[10px] font-medium italic" aria-hidden="true">
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-border bg-surface-raised px-2.5 py-2 text-xs font-normal leading-snug text-fg opacity-0 shadow-card invisible transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
