interface StepperProps {
  value: number
  min?: number
  step?: number
  unit: string
  onChange: (value: number) => void
}

const BUTTON_CLASS =
  'nodrag inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center font-sans text-[15px] font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg'

export function Stepper({ value, min = 0, step = 10, unit, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between overflow-hidden rounded-md border border-border bg-surface-raised">
      <button type="button" className={BUTTON_CLASS} onClick={() => onChange(Math.max(min, value - step))} aria-label={`Decrease ${unit}`}>
        −
      </button>
      <span className="inline-flex items-baseline gap-1.5">
        <span className="font-mono text-[15px] font-medium tabular-nums text-fg">{value}</span>
        <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-fg-muted">{unit}</span>
      </span>
      <button type="button" className={BUTTON_CLASS} onClick={() => onChange(value + step)} aria-label={`Increase ${unit}`}>
        +
      </button>
    </div>
  )
}
