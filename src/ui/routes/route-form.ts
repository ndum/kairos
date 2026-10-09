import type { RouteDraft } from '@/application/route-library'
import type { Place, PreferredLine, Route, StopRef } from '@/domain/route'
import { isValidName } from '@/domain/route-rules'
import { MINUTE, minutes } from '@/domain/time'

// The editor works with whole minutes and an optional stop. The domain uses durations.

export interface PlaceForm {
  name: string
  stop: StopRef | null
  /** Minutes on foot between the place and its stop. */
  walk: number
  /** Extra minutes the user wants to keep. */
  reserve: number
}

export interface RouteForm {
  name: string
  places: [PlaceForm, PlaceForm]
  preferredLines: PreferredLine[]
}

export const DEFAULT_WALK = 5
export const DEFAULT_RESERVE = 3

export const emptyPlace = (): PlaceForm => ({
  name: '',
  stop: null,
  walk: DEFAULT_WALK,
  reserve: DEFAULT_RESERVE,
})

export const emptyForm = (): RouteForm => ({
  name: '',
  places: [emptyPlace(), emptyPlace()],
  preferredLines: [],
})

const placeFormOf = (place: Place): PlaceForm => ({
  name: place.name,
  stop: place.stop,
  walk: Math.round(place.walk / MINUTE),
  reserve: Math.round(place.reserve / MINUTE),
})

export const formOf = (route: Route): RouteForm => ({
  name: route.name,
  places: [placeFormOf(route.places[0]), placeFormOf(route.places[1])],
  preferredLines: [...route.preferredLines],
})

function placeOf(form: PlaceForm): Place {
  if (!form.stop) throw new Error(`The place "${form.name}" has no stop yet.`)
  return {
    name: form.name,
    stop: form.stop,
    walk: minutes(form.walk),
    reserve: minutes(form.reserve),
  }
}

export const draftOf = (form: RouteForm): RouteDraft => ({
  name: form.name,
  places: [placeOf(form.places[0]), placeOf(form.places[1])],
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
