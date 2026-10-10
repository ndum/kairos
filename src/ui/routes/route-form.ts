import type { RouteDraft } from '@/application/route-library'
import type { Coordinates } from '@/domain/geo'
import type { Place, PreferredLine, Route, StopRef } from '@/domain/route'
import { DEFAULT_BUFFER, isValidName } from '@/domain/route-rules'
import { MINUTE, minutes } from '@/domain/time'

// The editor works with whole minutes and an optional stop. The domain uses durations.

export interface PlaceForm {
  name: string
  stop: StopRef | null
  /** Minutes on foot between the place and its stop. */
  walk: number
  /** Position of the place itself, which stays on the device. */
  coordinates?: Coordinates
}

export interface RouteForm {
  name: string
  places: [PlaceForm, PlaceForm]
  /** Extra minutes kept when leaving either place. */
  buffer: number
  preferredLines: PreferredLine[]
}

export const DEFAULT_WALK = 5

export const emptyPlace = (): PlaceForm => ({
  name: '',
  stop: null,
  walk: DEFAULT_WALK,
})

export const emptyForm = (): RouteForm => ({
  name: '',
  places: [emptyPlace(), emptyPlace()],
  buffer: DEFAULT_BUFFER / MINUTE,
  preferredLines: [],
})

const placeFormOf = (place: Place): PlaceForm => ({
  name: place.name,
  stop: place.stop,
  walk: Math.round(place.walk / MINUTE),
  ...(place.coordinates && { coordinates: place.coordinates }),
})

export const formOf = (route: Route): RouteForm => ({
  name: route.name,
  places: [placeFormOf(route.places[0]), placeFormOf(route.places[1])],
  buffer: Math.round(route.buffer / MINUTE),
  preferredLines: [...route.preferredLines],
})

function placeOf(form: PlaceForm): Place {
  if (!form.stop) throw new Error(`The place "${form.name}" has no stop yet.`)
  return {
    name: form.name,
    stop: form.stop,
    walk: minutes(form.walk),
    ...(form.coordinates && { coordinates: form.coordinates }),
  }
}

export const draftOf = (form: RouteForm): RouteDraft => ({
  name: form.name,
  places: [placeOf(form.places[0]), placeOf(form.places[1])],
  buffer: minutes(form.buffer),
  preferredLines: form.preferredLines,
})

/** A name for the route made of the names of both places, for example "Home ↔ Office". */
export const suggestedName = (form: RouteForm): string =>
  form.places
    .map((place) => place.name.trim())
    .filter(Boolean)
    .join(' ↔ ')

export type NameError = 'missing' | 'too-long'

function nameErrorOf(name: string): NameError | undefined {
  if (name.trim() === '') return 'missing'
  return isValidName(name) ? undefined : 'too-long'
}

export interface PlaceErrors {
  readonly name?: NameError
  readonly stop?: 'missing' | 'same'
}

export function placeErrors(form: RouteForm, index: 0 | 1): PlaceErrors {
  const place = form.places[index]
  const other = form.places[index === 0 ? 1 : 0]
  const name = nameErrorOf(place.name)

  let stop: PlaceErrors['stop']
  if (!place.stop) stop = 'missing'
  else if (index === 1 && place.stop.id === other.stop?.id) stop = 'same'

  return { ...(name && { name }), ...(stop && { stop }) }
}

export const nameError = (form: RouteForm): NameError | undefined => nameErrorOf(form.name)
