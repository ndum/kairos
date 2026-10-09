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

export interface RideLeg {
  readonly kind: 'ride'
  readonly line: Line
  readonly departure: StopEvent
  readonly arrival: StopEvent
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

export const walkingTime = (legs: readonly Leg[]): Duration =>
  legs.reduce((total, leg) => (leg.kind === 'walk' ? total + leg.duration : total), 0)
