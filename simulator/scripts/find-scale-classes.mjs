import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SPACING_STEP_PX = 4

const SPACING_PREFIXES = new Set([
  'w', 'h', 'size', 'min-w', 'max-w', 'min-h', 'max-h',
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me',
  'gap', 'gap-x', 'gap-y', 'space-x', 'space-y',
  'inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'start', 'end',
  'translate-x', 'translate-y', 'basis', 'scroll-m', 'scroll-p', 'indent',
])

const ARBITRARY_PX = /(?<![\w-])([a-z]+(?:-[a-z]+)*)-\[(-?\d+(?:\.\d+)?)px\]/g

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(path) ? [path] : []
  })
}

function onScale(prefix, pixels) {
  const steps = pixels / SPACING_STEP_PX
  const suffix = String(Math.abs(steps))

  return steps < 0 ? `-${prefix}-${suffix}` : `${prefix}-${suffix}`
}

const exact = []
const fractional = []
const offScale = new Map()

for (const file of sourceFiles('src')) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      for (const [full, prefix, raw] of line.matchAll(ARBITRARY_PX)) {
        const pixels = Number(raw)
        const where = `${file}:${index + 1}`

        if (!SPACING_PREFIXES.has(prefix)) {
          offScale.set(prefix, (offScale.get(prefix) ?? 0) + 1)
          continue
        }

        const bucket = Number.isInteger(pixels / SPACING_STEP_PX) ? exact : fractional
        bucket.push({ full, suggestion: onScale(prefix, pixels), where })
      }
    })
}

function report(title, rows) {
  console.log(`\n${title} (${rows.length})`)
  for (const { full, suggestion, where } of rows) {
    console.log(`  ${full.padEnd(22)} -> ${suggestion.padEnd(18)} ${where}`)
  }
}

report('on the spacing scale', exact)
report('fractional steps, valid but less readable', fractional)

console.log(`\noutside the spacing scale, arbitrary is correct (${[...offScale.values()].reduce((a, b) => a + b, 0)})`)
for (const [prefix, count] of [...offScale].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${prefix.padEnd(22)} ${count}`)
}
