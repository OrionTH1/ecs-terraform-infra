import { PACKET_GLOW_PX, PACKET_RADIUS, type PacketColor } from '../simulation/packets'

const SPRITE_RESOLUTION = 6

const COLOR_TOKEN: Record<PacketColor, string> = {
  default: '--color-border-interaction',
  write: '--color-status-warning',
  blocked: '--color-status-error',
}

const GLOW_ALPHA: Record<PacketColor, number> = {
  default: 0.45,
  write: 0.45,
  blocked: 0.5,
}

export const SPRITE_SIZE_PX = (PACKET_RADIUS + PACKET_GLOW_PX) * 2

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function toRgb(color: string): [number, number, number] {
  const hex = color.replace('#', '')
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
  const value = Number.parseInt(full, 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function drawSprite(color: PacketColor): HTMLCanvasElement {
  const size = SPRITE_SIZE_PX * SPRITE_RESOLUTION
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size

  const context = sprite.getContext('2d')
  if (!context) return sprite

  const [red, green, blue] = toRgb(readToken(COLOR_TOKEN[color]) || '#3b82f6')
  const centre = size / 2
  const core = PACKET_RADIUS * SPRITE_RESOLUTION

  const glow = context.createRadialGradient(centre, centre, core * 0.6, centre, centre, centre)
  glow.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${GLOW_ALPHA[color]})`)
  glow.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`)

  context.fillStyle = glow
  context.fillRect(0, 0, size, size)

  context.beginPath()
  context.arc(centre, centre, core, 0, Math.PI * 2)
  context.fillStyle = `rgb(${red}, ${green}, ${blue})`
  context.fill()

  return sprite
}

export function buildPacketSprites(): Record<PacketColor, HTMLCanvasElement> {
  return {
    default: drawSprite('default'),
    write: drawSprite('write'),
    blocked: drawSprite('blocked'),
  }
}
