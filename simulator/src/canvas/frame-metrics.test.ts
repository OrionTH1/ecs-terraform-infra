import { describe, expect, it } from 'vitest'
import {
  FRAME_HEADER_HEIGHT,
  FRAME_MIN_HEIGHT,
  FRAME_MIN_WIDTH,
  FRAME_PADDING,
  frameAround,
  frameContentOriginY,
  frameHeightFor,
  frameLeftFor,
  frameWidthFor,
} from './frame-metrics'

const WIDE_CONTENT = FRAME_MIN_WIDTH * 2

describe('frame geometry', () => {
  it('pads content by the same amount on both sides', () => {
    expect(frameWidthFor(WIDE_CONTENT)).toBe(WIDE_CONTENT + FRAME_PADDING * 2)
  })

  it('reserves the header plus padding above the content', () => {
    expect(frameHeightFor(200)).toBe(FRAME_HEADER_HEIGHT + FRAME_PADDING * 2 + 200)
    expect(frameContentOriginY(0)).toBe(FRAME_HEADER_HEIGHT + FRAME_PADDING)
  })

  it('never collapses below the minimum a header needs to stay readable', () => {
    expect(frameWidthFor(10)).toBe(FRAME_MIN_WIDTH)
    expect(frameHeightFor(0)).toBe(FRAME_MIN_HEIGHT)
  })

  it('keeps content centred when the minimum width kicks in', () => {
    const width = frameWidthFor(10)
    const left = frameLeftFor(100, 10, width)

    expect(100 - left).toBe(left + width - 110)
  })

  it('wraps a content box symmetrically on both axes', () => {
    const frame = frameAround({ left: 100, top: 50, right: 100 + WIDE_CONTENT, bottom: 250 })

    expect(frame.position.x).toBe(100 - FRAME_PADDING)
    expect(frame.position.y).toBe(50 - FRAME_HEADER_HEIGHT - FRAME_PADDING)
    expect(frame.width).toBe(WIDE_CONTENT + FRAME_PADDING * 2)
    expect(frame.height).toBe(200 + FRAME_HEADER_HEIGHT + FRAME_PADDING * 2)
  })

  it('nests one frame inside another without losing the padding step', () => {
    const inner = frameWidthFor(WIDE_CONTENT)
    const outer = frameWidthFor(inner)

    expect(outer - inner).toBe(FRAME_PADDING * 2)
  })
})
