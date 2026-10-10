import type { Journey, Leg, RideLeg, StopEvent, TransportMode, WalkLeg } from '@/domain/journey'
import type { Place, PreferredLine, Route, StopRef } from '@/domain/route'
import { type Instant, minutes } from '@/domain/time'

/** An instant on Monday, 12 October 2026, in Swiss summer time. */
export const at = (time: string): Instant => Date.parse(`2026-10-12T${time}:00+02:00`)

export const stop = (name: string): StopRef => ({ id: name, name })

export interface RideOptions {
  readonly mode?: TransportMode
  /** Delay in minutes at departure. Also used for the arrival unless arrivalDelay is set. */
  readonly delay?: number
  readonly arrivalDelay?: number
  readonly cancelled?: boolean
  readonly platform?: string
  /** Stops between departure and arrival as pairs of stop name and time. */
  readonly stopovers?: readonly (readonly [string, string])[]
  readonly tripNumber?: string
  readonly operator?: string
}

const event = (
  stopName: string,
  time: string,
  delay: number | undefined,
  platform?: string,
): StopEvent => {
  const scheduledAt = at(time)
  return {
    stop: stop(stopName),
    scheduledAt,
    expectedAt: delay === undefined ? undefined : scheduledAt + minutes(delay),
    platform,
  }
}

export function ride(
  lineName: string,
  from: string,
  departure: string,
  to: string,
  arrival: string,
  options: RideOptions = {},
): RideLeg {
  return {
    kind: 'ride',
    line: { name: lineName, mode: options.mode ?? 'train' },
    departure: event(from, departure, options.delay, options.platform),
    arrival: event(to, arrival, options.arrivalDelay ?? options.delay),
    stopovers: (options.stopovers ?? []).map(([name, time]) => ({
      stop: stop(name),
      scheduledAt: at(time),
    })),
    tripNumber: options.tripNumber,
    operator: options.operator,
    cancelled: options.cancelled ?? false,
  }
}

export const walk = (from: string, to: string, walkMinutes: number): WalkLeg => ({
  kind: 'walk',
  from: stop(from),
  to: stop(to),
  duration: minutes(walkMinutes),
})

export const journey = (...legs: Leg[]): Journey => ({ legs })

export const place = (
  name: string,
  stopName: string,
  { walk: walkMinutes = 0, reserve = 0 }: { walk?: number; reserve?: number } = {},
): Place => ({
  name,
  stop: stop(stopName),
  walk: minutes(walkMinutes),
  reserve: minutes(reserve),
})

export const home = place('Home', 'Riverside', { walk: 8, reserve: 3 })
export const office = place('Office', 'Market Square', { walk: 5, reserve: 3 })
export const gym = place('Gym', 'Lakeside', { walk: 4, reserve: 2 })

export const route = (
  id: string,
  name = 'Commute',
  places: readonly [Place, Place] = [home, office],
  preferredLines: readonly PreferredLine[] = [],
): Route => ({ id, name, places, preferredLines })

export const trainLine = (name: string): PreferredLine => ({ name, mode: 'train' })
export const busLine = (name: string): PreferredLine => ({ name, mode: 'bus' })

/** S1 to Central, then bus 20 to Market Square. */
export const morningCommute = (departure = '07:05', options: RideOptions = {}): Journey => {
  const [hours = '07', mins = '05'] = departure.split(':')
  const shift = (offset: number): string => {
    const total = Number(hours) * 60 + Number(mins) + offset
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  return journey(
    ride('S1', 'Riverside', departure, 'Central', shift(9), options),
    walk('Central', 'Central, Bus Station', 4),
    ride('20', 'Central, Bus Station', shift(14), 'Market Square', shift(18), { mode: 'bus' }),
  )
}
