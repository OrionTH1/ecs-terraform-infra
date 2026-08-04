import { ChevronIcon } from '../../icons'
import type { TaskLogEntry } from '../../types/task-data'

interface TaskDebugLogProps {
  log: TaskLogEntry[]
  createdAt: number
  isExpanded: boolean
  onToggle: () => void
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.round(elapsedMs / 1000)
  if (totalSeconds < 60) return `+${totalSeconds}s`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds === 0 ? `+${minutes}m` : `+${minutes}m ${seconds}s`
}

export function TaskDebugLog({ log, createdAt, isExpanded, onToggle }: TaskDebugLogProps) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="nodrag flex w-full cursor-pointer items-center justify-between gap-2 border-t border-border pt-2 text-fg-muted/70 transition-colors duration-150 hover:text-fg-muted"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className="font-sans text-[10px] font-medium uppercase tracking-wider">
          {isExpanded ? 'Hide' : 'Show'} debug logs
        </span>
        <ChevronIcon className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="overflow-hidden">
          <ol className="mt-2.5 flex flex-col gap-2">
            {log.map((entry, index) => {
              const isLatest = index === log.length - 1

              return (
                <li
                  key={`${entry.atMs}-${index}`}
                  className="relative flex gap-2.5"
                  style={{ animation: 'log-entry-in 280ms ease-out' }}
                >
                  {isLatest ? null : <span className="absolute top-[13px] bottom-[-14px] left-[3px] w-px bg-border/60" />}
                  <span
                    className={`z-10 mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full transition-colors duration-300 ${
                      isLatest ? 'bg-border-interaction' : 'bg-border'
                    }`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`font-mono text-[11px] leading-snug transition-colors duration-300 ${
                        isLatest ? 'text-fg/80' : 'text-fg-muted/60'
                      }`}
                    >
                      {entry.message}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-fg-muted/50">
                      {formatElapsed(entry.atMs - createdAt)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
