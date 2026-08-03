interface StepperProps {
  value: number
  min?: number
  step?: number
  unit: string
  onChange: (value: number) => void
}

export function Stepper({ value, min = 0, step = 10, unit, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-md border border-border bg-surface-raised font-sans text-[13px] font-semibold text-fg transition-colors duration-150 hover:border-border-interaction hover:bg-surface"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label={`Decrease ${unit}`}
      >
        −
      </button>
      <span className="min-w-[34px] text-center font-mono text-sm font-medium text-fg">{value}</span>
      <button
        type="button"
        className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-md border border-border bg-surface-raised font-sans text-[13px] font-semibold text-fg transition-colors duration-150 hover:border-border-interaction hover:bg-surface"
        onClick={() => onChange(value + step)}
        aria-label={`Increase ${unit}`}
      >
        +
      </button>
      <span className="font-sans text-[11px] text-fg-muted">{unit}</span>
    </div>
  )
}
