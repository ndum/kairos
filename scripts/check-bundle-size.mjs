// Fails when the JavaScript needed for the first render exceeds the budget.
// Reads the Vite manifest and follows static imports from the entry chunk.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 100
const DIST = 'dist'

const manifest = JSON.parse(await readFile(join(DIST, '.vite', 'manifest.json'), 'utf8'))
const entry = Object.values(manifest).find((chunk) => chunk.isEntry)

if (!entry) {
  console.error('No entry chunk found in dist/.vite/manifest.json. Run the build first.')
  process.exit(1)
}

const files = new Set()
const collect = (chunk) => {
  if (files.has(chunk.file)) return
  files.add(chunk.file)
  for (const key of chunk.imports ?? []) collect(manifest[key])
}
collect(entry)

const format = (bytes) => `${(bytes / 1024).toFixed(1).padStart(7)} KB`
let total = 0
for (const file of files) {
  const size = gzipSync(await readFile(join(DIST, file))).length
  total += size
  console.log(`${format(size)}  ${file}`)
}
console.log(`${format(total)}  initial JavaScript, gzip (budget ${BUDGET_KB} KB)`)

if (total > BUDGET_KB * 1024) {
  console.error(`Over budget by ${format(total - BUDGET_KB * 1024).trim()}.`)
  process.exit(1)
}
