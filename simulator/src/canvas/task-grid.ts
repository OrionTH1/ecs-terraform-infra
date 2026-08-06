export const MAX_TASK_ROWS = 5

export function taskColumnCount(taskCount: number): number {
  return Math.max(1, Math.ceil(taskCount / MAX_TASK_ROWS))
}

export function taskColumnOf(index: number): number {
  return Math.floor(index / MAX_TASK_ROWS)
}

export function gridColumnHeights(heights: number[], rowGap: number): number[] {
  const columns: number[] = []

  heights.forEach((height, index) => {
    const column = taskColumnOf(index)
    columns[column] = (columns[column] ?? -rowGap) + rowGap + height
  })

  return columns
}

export function gridHeight(heights: number[], rowGap: number): number {
  return Math.max(0, ...gridColumnHeights(heights, rowGap))
}

export function gridWidth(columnCount: number, columnWidth: number, columnGap: number): number {
  return columnCount * columnWidth + (columnCount - 1) * columnGap
}
