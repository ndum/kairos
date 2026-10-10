// Writes the line coverage of the last test run as an endpoint for shields.io, which the
// coverage badge in the README reads from GitHub Pages.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SUMMARY = 'coverage/coverage-summary.json'
const BADGE = 'dist/badges/coverage.json'

const { total } = JSON.parse(await readFile(SUMMARY, 'utf8'))
const percent = total.lines.pct

const color = percent >= 95 ? 'brightgreen' : percent >= 90 ? 'green' : 'orange'
const badge = { schemaVersion: 1, label: 'coverage', message: `${Math.floor(percent)}%`, color }

await mkdir(dirname(BADGE), { recursive: true })
await writeFile(BADGE, `${JSON.stringify(badge)}\n`)
console.log(`Coverage badge: ${badge.message} in ${BADGE}`)
