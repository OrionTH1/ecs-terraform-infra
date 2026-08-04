import { useMemo } from 'react'
import type { CSSProperties } from 'react'

const PARTICLE_COUNT = 10
const PARTICLE_SPREAD_X = 70
const PARTICLE_SPREAD_Y = 38
const DURATION_MS = 380

export function TaskBlastEffect() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const angle = (index / PARTICLE_COUNT) * Math.PI * 2
        return {
          x: Math.cos(angle) * PARTICLE_SPREAD_X,
          y: Math.sin(angle) * PARTICLE_SPREAD_Y,
          delay: index % 2 === 0 ? 0 : 40,
        }
      }),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      <div
        className="absolute inset-0 rounded-card bg-status-error/40"
        style={{ animation: `blast-flash ${DURATION_MS * 0.7}ms ease-out forwards` }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-14 w-14 rounded-full border-2 border-status-error"
        style={{ animation: `blast-ring ${DURATION_MS}ms ease-out forwards` }}
      />
      {particles.map((particle, index) => (
        <span
          key={index}
          className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-status-error"
          style={
            {
              animation: `blast-particle ${DURATION_MS}ms ease-out ${particle.delay}ms forwards`,
              '--blast-x': `${particle.x}px`,
              '--blast-y': `${particle.y}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
