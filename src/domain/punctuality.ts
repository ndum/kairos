import { type Journey, type TransportMode, delayOf, ridesOf } from './journey'
import { type Duration, HOUR, type Instant, minutes } from './time'

/** The last known delays of one vehicle the user rode on a route. */
export interface DelayRecord {
  readonly routeId: string
  readonly line: string
  readonly mode: TransportMode
  /** Scheduled departure, which together with the line tells the vehicle apart. */
  readonly departureAt: Instant
  readonly departureDelay: Duration
  readonly arrivalDelay: Duration
}

/** How punctual one line was on a route lately. */
export interface LinePunctuality {
  readonly line: string
  readonly mode: TransportMode
  readonly count: number
  /** Average delay at the arrival, which is what makes the user late. */
  readonly averageDelay: Duration
  /** Rides that arrived at least LATE_ARRIVAL later. */
  readonly late: number
}

export const PUNCTUALITY_WINDOW: Duration = 14 * 24 * HOUR
/** Records are kept a while longer than they count, and only up to a limit. */
export const RECORD_LIFETIME: Duration = 30 * 24 * HOUR
export const RECORD_LIMIT = 400
/** Fewer rides say nothing about a line. */
export const MIN_RIDES = 3
export const LATE_ARRIVAL: Duration = minutes(3)

/** The delays of every vehicle of a journey as they are known now. */
export const recordsOf = (routeId: string, journey: Journey): DelayRecord[] =>
  ridesOf(journey).map((ride) => ({
    routeId,
    line: ride.line.name,
    mode: ride.line.mode,
    departureAt: ride.departure.scheduledAt,
    departureDelay: Math.max(0, delayOf(ride.departure)),
    arrivalDelay: Math.max(0, delayOf(ride.arrival)),
  }))

const sameRide = (a: DelayRecord, b: DelayRecord): boolean =>
  a.routeId === b.routeId && a.line === b.line && a.departureAt === b.departureAt

/** Puts newer records in place of older ones of the same vehicle and drops old records. */
export function mergeRecords(
  records: readonly DelayRecord[],
  fresh: readonly DelayRecord[],
  now: Instant,
): DelayRecord[] {
  return [...records.filter((record) => !fresh.some((other) => sameRide(record, other))), ...fresh]
    .filter((record) => now - record.departureAt <= RECORD_LIFETIME)
    .sort((a, b) => a.departureAt - b.departureAt)
    .slice(-RECORD_LIMIT)
}

/** Drops the records of a journey, for example of a ride the user was not on after all. */
export const withoutJourney = (
  records: readonly DelayRecord[],
  routeId: string,
  journey: Journey,
): DelayRecord[] => {
  const dropped = recordsOf(routeId, journey)
  return records.filter((record) => !dropped.some((other) => sameRide(record, other)))
}

/** Punctuality of the lines of a route over the last two weeks, lines with too few rides left out. */
export function punctualityOf(
  records: readonly DelayRecord[],
  routeId: string,
  now: Instant,
): LinePunctuality[] {
  const byLine = new Map<string, DelayRecord[]>()
  for (const record of records) {
    if (record.routeId !== routeId || now - record.departureAt > PUNCTUALITY_WINDOW) continue
    byLine.set(record.line, [...(byLine.get(record.line) ?? []), record])
  }
  return [...byLine.values()]
    .filter((rides) => rides.length >= MIN_RIDES)
    .map((rides) => ({
      line: rides[0]?.line ?? '',
      mode: rides[0]?.mode ?? 'other',
      count: rides.length,
      averageDelay: rides.reduce((sum, ride) => sum + ride.arrivalDelay, 0) / rides.length,
      late: rides.filter((ride) => ride.arrivalDelay >= LATE_ARRIVAL).length,
    }))
}

/** A line is worth a warning when every third ride or more arrived late. */
export const oftenLate = (punctuality: LinePunctuality): boolean =>
  punctuality.late * 3 >= punctuality.count
