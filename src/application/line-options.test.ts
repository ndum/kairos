import { describe, expect, it, vi } from 'vitest'

import { at, home, journey, morningCommute, office, ride, walk } from '@/test/builders'

import { LINE_SAMPLE_SIZE, findLineOptions } from './line-options'
import type { TimetablePort } from './ports/timetable'

const homeward = journey(
  ride('20', 'Market Square', '17:02', 'Central, Bus Station', '17:07', { mode: 'bus' }),
  walk('Central, Bus Station', 'Central', 4),
  ride('S2', 'Central', '17:15', 'Riverside', '17:24'),
)

describe('findLineOptions', () => {
  it('suggests the lines of the next journeys in both directions', async () => {
    const findJourneys = vi
      .fn<TimetablePort['findJourneys']>()
      .mockImplementation(({ from }) =>
        Promise.resolve(from.id === home.stop.id ? [morningCommute()] : [homeward]),
      )
    const signal = new AbortController().signal

    const options = await findLineOptions(
      { findJourneys, searchStops: vi.fn(), stopsNear: vi.fn() },
      [home.stop, office.stop],
      at('07:00'),
      signal,
    )

    expect(findJourneys).toHaveBeenCalledWith(
      { from: home.stop, to: office.stop, at: at('07:00'), limit: LINE_SAMPLE_SIZE },
      signal,
    )
    expect(findJourneys).toHaveBeenCalledWith(
      { from: office.stop, to: home.stop, at: at('07:00'), limit: LINE_SAMPLE_SIZE },
      signal,
    )
    expect(options.journeys).toEqual([morningCommute(), homeward])
    expect(options.lines).toEqual([
      { name: 'S1', mode: 'train', journeys: 1 },
      { name: '20', mode: 'bus', journeys: 2 },
      { name: 'S2', mode: 'train', journeys: 1 },
    ])
    expect(options.variants).toEqual([
      {
        lines: [
          { name: 'S1', mode: 'train' },
          { name: '20', mode: 'bus' },
        ],
        journeys: 1,
        duration: 18 * 60_000,
      },
    ])
  })
})
