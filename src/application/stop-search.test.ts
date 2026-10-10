import { describe, expect, it, vi } from 'vitest'

import { stop } from '@/test/builders'

import type { TimetablePort } from './ports/timetable'
import { StopSearch } from './stop-search'

function setup(cacheSize?: number) {
  const searchStops = vi
    .fn<TimetablePort['searchStops']>()
    .mockImplementation((text) => Promise.resolve([stop(`${text} Station`)]))
  const search = new StopSearch({ findJourneys: vi.fn(), searchStops }, { cacheSize })
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

    expect(await search.find('  Bern   Bahnhof ', signal)).toEqual([stop('Bern Bahnhof Station')])
    expect(searchStops).toHaveBeenCalledWith('Bern Bahnhof', signal)
  })

  it('answers repeated searches from memory, regardless of case', async () => {
    const { search, searchStops } = setup()

    await search.find('Thun')
    expect(await search.find('thun ')).toEqual([stop('Thun Station')])
    expect(searchStops).toHaveBeenCalledOnce()
  })

  it('forgets the oldest searches first', async () => {
    const { search, searchStops } = setup(2)

    await search.find('Bern')
    await search.find('Thun')
    await search.find('Bern')
    await search.find('Spiez')
    await search.find('Bern')
    await search.find('Thun')

    expect(searchStops.mock.calls.map(([text]) => text)).toEqual(['Bern', 'Thun', 'Spiez', 'Thun'])
  })

  it('does not remember failed searches', async () => {
    const { search, searchStops } = setup()
    searchStops.mockRejectedValueOnce(new Error('Offline'))

    await expect(search.find('Bern')).rejects.toThrow('Offline')
    expect(await search.find('Bern')).toEqual([stop('Bern Station')])
  })
})
