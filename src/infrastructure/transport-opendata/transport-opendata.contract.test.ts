import { describe, expect, it } from 'vitest'

import { TransportOpendataTimetable } from './transport-opendata-timetable'

// Runs against the real API in a scheduled workflow, so changes on its side show up early.

const timetable = new TransportOpendataTimetable({ timeout: 20_000 })

/** Next Monday at about seven in the morning, when trains are guaranteed to run. */
function nextMondayMorning(): number {
  const date = new Date()
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7
  date.setUTCDate(date.getUTCDate() + daysUntilMonday)
  date.setUTCHours(5, 0, 0, 0)
  return date.getTime()
}

describe('Transport API contract', () => {
  it('finds stations by name', async () => {
    const stops = await timetable.searchStops('Bern')

    expect(stops).toContainEqual(expect.objectContaining({ id: '8507000', name: 'Bern' }))
  })

  it('returns journeys that map to trains, buses and walks', async () => {
    const journeys = await timetable.findJourneys({
      from: { id: '8507100', name: 'Thun' },
      to: { id: '8507110', name: 'Bern, Zytglogge' },
      at: nextMondayMorning(),
      limit: 4,
    })

    expect(journeys.length).toBeGreaterThan(0)
    const legs = journeys.flatMap((journey) => journey.legs)
    expect(legs.some((leg) => leg.kind === 'ride' && leg.line.mode === 'train')).toBe(true)
    expect(legs.some((leg) => leg.kind === 'walk' && leg.duration > 0)).toBe(true)
  })
})
