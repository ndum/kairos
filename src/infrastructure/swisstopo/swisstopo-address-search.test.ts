import { describe, expect, it, vi } from 'vitest'

import { SwisstopoAddressSearch, addressName } from './swisstopo-address-search'

const result = (label: string, lat: number, lon: number) => ({
  attrs: { label, lat, lon, origin: 'address', detail: label.toLowerCase() },
})

const answer = (body: unknown) =>
  vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(body))

describe('addressName', () => {
  it('separates the street from the postcode and town', () => {
    expect(addressName('Messeplatz 1 <b>4058 Basel</b>')).toBe('Messeplatz 1, 4058 Basel')
  })

  it('keeps labels without a street', () => {
    expect(addressName('<b>4410 Liestal</b>')).toBe('4410 Liestal')
  })
})

describe('SwisstopoAddressSearch', () => {
  it('finds addresses with their position', async () => {
    const fetch = answer({
      results: [result('Rheinstrasse 27 <b>4410 Liestal</b>', 47.4861, 7.7307)],
    })

    const places = await new SwisstopoAddressSearch({ fetch }).searchPlaces('Rheinstrasse 27')

    const input = fetch.mock.calls[0]?.[0]
    if (typeof input !== 'string') throw new Error('Expected a request to a URL string')
    const url = new URL(input)
    expect(url.pathname).toBe('/rest/services/api/SearchServer')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      searchText: 'Rheinstrasse 27',
      origins: 'address',
      sr: '4326',
    })
    expect(places).toEqual([
      {
        name: 'Rheinstrasse 27, 4410 Liestal',
        kind: 'address',
        coordinates: { latitude: 47.4861, longitude: 7.7307 },
      },
    ])
  })

  it('reports data that does not match the schema', async () => {
    const search = new SwisstopoAddressSearch({ fetch: answer({ results: [{ attrs: {} }] }) })

    await expect(search.searchPlaces('Basel')).rejects.toMatchObject({
      reason: 'invalid-response',
    })
  })
})
