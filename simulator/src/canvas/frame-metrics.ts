export const FRAME_PADDING = 22
export const FRAME_HEADER_HEIGHT = 28
export const FRAME_HEADER_INSET = 14
export const FRAME_MIN_HEIGHT = 96
export const FRAME_MIN_WIDTH = 324

export interface ContentBox {
  left: number
  top: number
  right: number
  bottom: number
}

export interface FrameBox {
  position: { x: number; y: number }
  width: number
  height: number
}

export function frameContentOriginY(frameTop: number): number {
  return frameTop + FRAME_HEADER_HEIGHT + FRAME_PADDING
}

export function frameHeightFor(contentHeight: number): number {
  return Math.max(FRAME_MIN_HEIGHT, FRAME_HEADER_HEIGHT + FRAME_PADDING * 2 + contentHeight)
}

export function frameWidthFor(contentWidth: number): number {
  return Math.max(FRAME_MIN_WIDTH, contentWidth + FRAME_PADDING * 2)
}

export function frameLeftFor(contentLeft: number, contentWidth: number, frameWidth: number): number {
  return contentLeft - (frameWidth - contentWidth) / 2
}

export function frameAround(content: ContentBox): FrameBox {
  const contentWidth = content.right - content.left
  const width = frameWidthFor(contentWidth)

  return {
    position: {
      x: frameLeftFor(content.left, contentWidth, width),
      y: content.top - FRAME_HEADER_HEIGHT - FRAME_PADDING,
    },
    width,
    height: frameHeightFor(content.bottom - content.top),
  }
}
