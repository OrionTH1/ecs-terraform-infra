import { describe, expect, it } from 'vitest'
import { MAX_TASK_ROWS, gridColumnHeights, gridHeight, gridWidth, taskColumnCount, taskColumnOf } from './task-grid'

const ROW_GAP = 20

describe('column count', () => {
  it('keeps a small service in a single column', () => {
    expect(taskColumnCount(MAX_TASK_ROWS)).toBe(1)
  })

  it('opens a second column only once the first one is full', () => {
    expect(taskColumnCount(MAX_TASK_ROWS + 1)).toBe(2)
  })

  it('still reports one column for a service with no tasks', () => {
    expect(taskColumnCount(0)).toBe(1)
  })
})

describe('placement stability', () => {
  it('fills a column top to bottom before starting the next one', () => {
    expect(taskColumnOf(0)).toBe(0)
    expect(taskColumnOf(MAX_TASK_ROWS - 1)).toBe(0)
    expect(taskColumnOf(MAX_TASK_ROWS)).toBe(1)
  })

  it('never moves a task that is already placed when the fleet grows', () => {
    const beforeGrowth = Array.from({ length: MAX_TASK_ROWS }, (_, index) => taskColumnOf(index))
    const afterGrowth = Array.from({ length: MAX_TASK_ROWS * 2 }, (_, index) => taskColumnOf(index))

    expect(afterGrowth.slice(0, MAX_TASK_ROWS)).toEqual(beforeGrowth)
  })
})

describe('grid measurements', () => {
  it('measures a single column as a plain stack', () => {
    expect(gridHeight([100, 100, 100], ROW_GAP)).toBe(340)
  })

  it('takes the tallest column once the grid wraps', () => {
    const heights = Array.from({ length: MAX_TASK_ROWS + 2 }, () => 100)

    expect(gridColumnHeights(heights, ROW_GAP)).toEqual([580, 220])
    expect(gridHeight(heights, ROW_GAP)).toBe(580)
  })

  it('measures an empty service as taking no space', () => {
    expect(gridHeight([], ROW_GAP)).toBe(0)
  })

  it('adds a gap between columns but not around them', () => {
    expect(gridWidth(1, 200, 20)).toBe(200)
    expect(gridWidth(3, 200, 20)).toBe(640)
  })
})
