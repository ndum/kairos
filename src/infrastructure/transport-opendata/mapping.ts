import { TimetableError } from '@/application/ports/timetable'
import type { Journey, Leg, Line, StopEvent, Stopover, TransportMode } from '@/domain/journey'
import type { StopRef } from '@/domain/route'
import { MINUTE, SECOND } from '@/domain/time'

import type { ApiCheckpoint, ApiConnection, ApiPass, ApiSection, ApiStation } from './schema'

const MODES: Readonly<Record<string, TransportMode>> = {
  S: 'train',
  SN: 'train',
  R: 'train',
  RE: 'train',
  IR: 'train',
  IC: 'train',
  ICE: 'train',
  EC: 'train',
  EN: 'train',
  NJ: 'train',
  TGV: 'train',
  RJX: 'train',
  PE: 'train',
  EXT: 'train',
  B: 'bus',
  BUS: 'bus',
  BN: 'bus',
  BP: 'bus',
  EXB: 'bus',
  KB: 'bus',
  NFB: 'bus',
  NFO: 'bus',
  EV: 'bus',
  T: 'tram',
  TRAM: 'tram',
  NFT: 'tram',
  BAT: 'ship',
  FAE: 'ship',
  BAV: 'ship',
  SL: 'cableway',
  GB: 'cableway',
  PB: 'cableway',
  LB: 'cableway',
  FUN: 'cableway',
}

/** S-Bahn lines are written without a space, for example S1 or SN5. */
const COMPACT_CATEGORIES = new Set(['S', 'SN'])

export function toLine(journey: NonNullable<ApiSection['journey']>): Line {
  const category = journey.category?.trim().toUpperCase() ?? ''
  // Long-distance trains carry their padded train number, for example "000107" of an ICE.
  const number = journey.number?.trim().replace(/^0+(?=.)/, '') ?? ''
  const mode = MODES[category] ?? 'other'

  let name: string
  if (mode !== 'train') name = number || category
  else if (COMPACT_CATEGORIES.has(category)) name = `${category}${number}`
  else name = [category, number].filter(Boolean).join(' ')

  return { name, mode, headsign: journey.to ?? undefined }
}

export function toStop(station: ApiStation): StopRef {
  const name = station.name ?? station.id ?? ''
  const latitude = station.coordinate?.x
  const longitude = station.coordinate?.y
  return {
    id: station.id ?? name,
    name,
    coordinates:
      typeof latitude === 'number' && typeof longitude === 'number'
        ? { latitude, longitude }
        : undefined,
  }
}

/** The API writes offsets as +0200, which only some engines parse. */
const parseApiTime = (value: string): number =>
  Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))

function toStopEvent(checkpoint: ApiCheckpoint, kind: 'departure' | 'arrival'): StopEvent {
  const timestamp =
    kind === 'departure' ? checkpoint.departureTimestamp : checkpoint.arrivalTimestamp
  if (timestamp == null) {
    const stopName = checkpoint.station.name ?? 'an unknown stop'
    throw new TimetableError('invalid-response', `Missing ${kind} time at ${stopName}.`)
  }

  const scheduledAt = timestamp * SECOND
  const prognosis = checkpoint.prognosis?.[kind]
  let expectedAt: number | undefined
  if (prognosis) expectedAt = parseApiTime(prognosis)
  else if (kind === 'departure' && checkpoint.delay != null)
    expectedAt = scheduledAt + checkpoint.delay * MINUTE

  const platform = checkpoint.platform ?? undefined
  const prognosisPlatform = checkpoint.prognosis?.platform ?? undefined

  return {
    stop: toStop(checkpoint.station),
    scheduledAt,
    expectedAt: expectedAt === undefined || Number.isNaN(expectedAt) ? undefined : expectedAt,
    platform,
    expectedPlatform: prognosisPlatform !== platform ? prognosisPlatform : undefined,
  }
}

/** The stops between the first and the last one. Stops without any time are left out. */
function toStopovers(passList: readonly ApiPass[] | null | undefined): Stopover[] {
  return (passList ?? []).slice(1, -1).flatMap((pass) => {
    const timestamp = pass.departureTimestamp ?? pass.arrivalTimestamp
    if (timestamp == null) return []
    const scheduledAt = timestamp * SECOND
    return [
      {
        stop: toStop(pass.station),
        scheduledAt,
        expectedAt: pass.delay == null ? undefined : scheduledAt + pass.delay * MINUTE,
        platform: pass.platform ?? undefined,
      },
    ]
  })
}

/** The API pads run numbers with zeros, for example "002254". */
function toTripNumber(name: string | null | undefined): string | undefined {
  const trimmed = name?.trim().replace(/^0+(?=.)/, '')
  return trimmed || undefined
}

function walkDuration(section: ApiSection): number {
  if (section.walk?.duration != null) return section.walk.duration * SECOND
  const start = section.departure.departureTimestamp
  const end = section.arrival.arrivalTimestamp
  return start != null && end != null ? (end - start) * SECOND : 0
}

function toLeg(section: ApiSection): Leg {
  // Walks carry a walk object. Their journey is null, or empty once nested journey fields
  // such as the pass list are requested.
  if (section.walk || !section.journey) {
    return {
      kind: 'walk',
      from: toStop(section.departure.station),
      to: toStop(section.arrival.station),
      duration: walkDuration(section),
    }
  }
  return {
    kind: 'ride',
    line: toLine(section.journey),
    departure: toStopEvent(section.departure, 'departure'),
    arrival: toStopEvent(section.arrival, 'arrival'),
    stopovers: toStopovers(section.journey.passList),
    tripNumber: toTripNumber(section.journey.name),
    operator: section.journey.operator?.trim() || undefined,
    // The Transport API does not report cancellations. Cancelled trips are left out of
    // its results instead.
    cancelled: false,
  }
}

export const toJourney = (connection: ApiConnection): Journey => ({
  legs: connection.sections.map(toLeg),
})
