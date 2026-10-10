import { describe, expect, it } from 'vitest'

import { SwisstopoAddressSearch } from './swisstopo-address-search'

// Runs against the real service in a scheduled workflow, so changes on its side show up early.

describe('swisstopo search contract', () => {
  it('finds an address with its position', async () => {
    const places = await new SwisstopoAddressSearch({ timeout: 20_000 }).searchPlaces(
      'Messeplatz 1 Basel',
    )

    expect(places[0]).toMatchObject({
      name: expect.stringContaining('4058 Basel') as string,
      kind: 'address',
    })
    expect(places[0]?.coordinates.latitude).toBeCloseTo(47.564, 2)
    expect(places[0]?.coordinates.longitude).toBeCloseTo(7.6, 2)
  })
})
