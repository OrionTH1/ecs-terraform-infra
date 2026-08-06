import { latencyTone, type LatencyTone } from './latency-format'
import { LATENCY_WARNING_MS } from '../../simulation/simulation-config'

interface LatencySparklineProps {
  history: number[]
  currentMs: number
}

const WIDTH = 164
const HEIGHT = 26
const SCALE_FLOOR_MS = 120
const WARNING_MEAN_MS = LATENCY_WARNING_MS / Math.LN2

const TONE_CLASS: Record<LatencyTone, string> = {
  idle: 'text-border-interaction',
  warning: 'text-status-warning',
  error: 'text-status-error',
}

function pointsOf(history: number[], ceilingMs: number): { x: number; y: number }[] {
  const lastIndex = history.length - 1

  return history.map((sampleMs, index) => ({
    x: (index / lastIndex) * WIDTH,
    y: HEIGHT - Math.min(sampleMs / ceilingMs, 1) * HEIGHT,
  }))
}

export function LatencySparkline({ history, currentMs }: LatencySparklineProps) {
  if (history.length < 2) return <div style={{ height: HEIGHT }} />

  const ceilingMs = Math.max(SCALE_FLOOR_MS, ...history)
  const points = pointsOf(history, ceilingMs)
  const coordinates = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
  const line = coordinates.join(' ')
  const area = `M 0,${HEIGHT} L ${coordinates.join(' L ')} L ${WIDTH},${HEIGHT} Z`
  const warningY = HEIGHT - Math.min(WARNING_MEAN_MS / ceilingMs, 1) * HEIGHT

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={`w-full transition-colors duration-500 ${TONE_CLASS[latencyTone(currentMs)]}`}
      style={{ height: HEIGHT }}
      role="img"
      aria-label={`Latency over the last ${history.length} samples`}
    >
      <line
        x1={0}
        x2={WIDTH}
        y1={warningY}
        y2={warningY}
        stroke="var(--color-border)"
        strokeWidth={1}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <path d={area} fill="currentColor" opacity={0.14} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
