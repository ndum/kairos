import type { StopRef } from './route'
import type { Duration, Instant } from './time'

export type TransportMode = 'train' | 'tram' | 'bus' | 'ship' | 'cableway' | 'other'

export interface Line {
  /** Name as shown on the vehicle, for example "S1" or "20". */
  readonly name: string
  readonly mode: TransportMode
  /** Final destination of the vehicle. */
  readonly headsign?: string
}

export interface StopEvent {
  readonly stop: StopRef
  readonly scheduledAt: Instant
  /** Real-time prognosis, if the operator provides one. */
  readonly expectedAt?: Instant
  readonly platform?: string
  /** Platform from the real-time prognosis, if it differs from the scheduled one. */
  readonly expectedPlatform?: string
}

/** A stop the vehicle calls at between boarding and alighting. */
export interface Stopover {
  readonly stop: StopRef
  /** Departure from the stop, or the arrival where the timetable has no departure. */
  readonly scheduledAt: Instant
  /** Real-time prognosis, if the operator reports a delay. */
  readonly expectedAt?: Instant
  readonly platform?: string
}

export interface RideLeg {
  readonly kind: 'ride'
  readonly line: Line
  readonly departure: StopEvent
  readonly arrival: StopEvent
  /** Stops between departure and arrival, in the order the vehicle calls at them. */
  readonly stopovers: readonly Stopover[]
  /** Number of this run, for trains the train number, for example "2254". */
  readonly tripNumber?: string
  /** Short name of the operator, for example "SBB". */
  readonly operator?: string
  readonly cancelled: boolean
}

export interface WalkLeg {
  readonly kind: 'walk'
  readonly from: StopRef
  readonly to: StopRef
  readonly duration: Duration
}

export type Leg = RideLeg | WalkLeg

/** A public transport connection from one stop to another. */
export interface Journey {
  readonly legs: readonly Leg[]
}

export const isRide = (leg: Leg): leg is RideLeg => leg.kind === 'ride'

export const ridesOf = (journey: Journey): RideLeg[] => journey.legs.filter(isRide)

/** Real-time time of an event, or the scheduled time without a prognosis. */
export const expectedTime = (event: StopEvent): Instant => event.expectedAt ?? event.scheduledAt

export const delayOf = (event: StopEvent): Duration => expectedTime(event) - event.scheduledAt

/** The stop a journey starts at, where the user arrives on foot. */
export function firstStopOf(journey: Journey): StopRef | undefined {
  const leg = journey.legs[0]
  return leg?.kind === 'walk' ? leg.from : leg?.departure.stop
}

/** The stop a journey ends at, where the user walks on from. */
export function lastStopOf(journey: Journey): StopRef | undefined {
  const leg = journey.legs.at(-1)
  return leg?.kind === 'walk' ? leg.to : leg?.arrival.stop
}

export const walkingTime = (legs: readonly Leg[]): Duration =>
  legs.reduce((total, leg) => (leg.kind === 'walk' ? total + leg.duration : total), 0)
