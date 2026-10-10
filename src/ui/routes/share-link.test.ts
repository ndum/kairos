import { describe, expect, it } from 'vitest'

import { shareCodeFrom } from './share-link'

describe('shareCodeFrom', () => {
  it('reads the code from a share link', () => {
    expect(shareCodeFrom('https://kairos.ndum.ch/#/import?r=q1W-e_9')).toBe('q1W-e_9')
    expect(shareCodeFrom(' http://localhost:5173/#/import?x=1&r=abc \n')).toBe('abc')
  })

  it('still reads links from the former address of the app', () => {
    expect(shareCodeFrom('https://ndum.github.io/kairos/#/import?r=q1W-e_9')).toBe('q1W-e_9')
  })

  it('takes text without a link as the code', () => {
    expect(shareCodeFrom('q1W-e_9')).toBe('q1W-e_9')
  })

  it('finds nothing in other text', () => {
    expect(shareCodeFrom('')).toBeNull()
    expect(shareCodeFrom('https://example.com/')).toBeNull()
    expect(shareCodeFrom('https://example.com/?q=kairos')).toBeNull()
    expect(shareCodeFrom('not a code')).toBeNull()
  })
})
