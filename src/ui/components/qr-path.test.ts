import { describe, expect, it } from 'vitest'

import { qrPath } from './qr-path'

const grid = (rows: string[]) => ({
  size: rows.length,
  get: (x: number, y: number) => rows[y]?.[x] === '#',
})

describe('qrPath', () => {
  it('draws runs of dark modules as one rectangle each', () => {
    expect(qrPath(grid(['##.', '.#.', '###']))).toBe('M0 0h2v1h-2zM1 1h1v1h-1zM0 2h3v1h-3z')
  })

  it('draws nothing for a blank code', () => {
    expect(qrPath(grid(['..', '..']))).toBe('')
  })
})
