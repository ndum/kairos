import { describe, expect, it, vi } from 'vitest'

import { stop } from '@/test/builders'

import type { TimetablePort } from './ports/timetable'
import { StopSearch } from './stop-search'

function setup(cacheSize?: number) {
  const searchStops = vi
    .fn<TimetablePort['searchStops']>()
    .mockImplementation((text) => Promise.resolve([stop(`${text} Station`)]))
  const search = new StopSearch(
    { findJourneys: vi.fn(), searchStops, stopsNear: vi.fn() },
    { cacheSize },
  )
  return { search, searchStops }
}

describe('StopSearch', () => {
  it('waits for at least two characters', async () => {
    const { search, searchStops } = setup()

    expect(await search.find(' B ')).toEqual([])
    expect(searchStops).not.toHaveBeenCalled()
  })

  it('searches with tidied spaces and passes the abort signal on', async () => {
    const { search, searchStops } = setup()
    const signal = new AbortController().signal

    expect(await search.find('  Basel   Bahnhof ', signal)).toEqual([stop('Basel Bahnhof Station')])
    expect(searchStops).toHaveBeenCalledWith('Basel Bahnhof', signal)
  })

  it('answers repeated searches from memory, regardless of case', async () => {
    const { search, searchStops } = setup()

    await search.find('Liestal')
    expect(await search.find('liestal ')).toEqual([stop('Liestal Station')])
    expect(searchStops).toHaveBeenCalledOnce()
  })

  it('forgets the oldest searches first', async () => {
    const { search, searchStops } = setup(2)

    await search.find('Basel')
    await search.find('Liestal')
    await search.find('Basel')
    await search.find('Pratteln')
    await search.find('Basel')
    await search.find('Liestal')

    expect(searchStops.mock.calls.map(([text]) => text)).toEqual([
      'Basel',
      'Liestal',
      'Pratteln',
      'Liestal',
    ])
  })

  it('does not remember failed searches', async () => {
    const { search, searchStops } = setup()
    searchStops.mockRejectedValueOnce(new Error('Offline'))

    await expect(search.find('Basel')).rejects.toThrow('Offline')
    expect(await search.find('Basel')).toEqual([stop('Basel Station')])
  })
})
