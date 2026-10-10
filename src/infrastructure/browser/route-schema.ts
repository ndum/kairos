import * as v from 'valibot'

import { CoordinatesSchema, StopSchema, TransportModeSchema } from './common-schemas'

const PlaceSchema = v.object({
  name: v.string(),
  stop: StopSchema,
  walk: v.number(),
  // Added in 1.3 without a new version: older data simply has no second stop.
  secondStop: v.optional(v.object({ stop: StopSchema, walk: v.number() })),
  coordinates: v.optional(CoordinatesSchema),
})

const PreferredLinesSchema = v.array(v.object({ name: v.string(), mode: TransportModeSchema }))

// Added in 1.3 without a new version: older data simply has no schedule.
const ScheduleSchema = v.array(
  v.object({
    weekday: v.picklist([1, 2, 3, 4, 5, 6, 7] as const),
    arriveBy: v.nullable(v.number()),
    returnFrom: v.nullable(v.number()),
  }),
)

export const RouteSchema = v.object({
  id: v.string(),
  name: v.string(),
  places: v.tuple([PlaceSchema, PlaceSchema]),
  buffer: v.number(),
  preferredLines: PreferredLinesSchema,
  schedule: v.optional(ScheduleSchema),
})

const PlaceV1Schema = v.object({ ...PlaceSchema.entries, reserve: v.number() })

/** Version 1 kept a reserve per place. The buffer of the route becomes the larger one. */
const RouteV1Schema = v.pipe(
  v.object({
    id: v.string(),
    name: v.string(),
    places: v.tuple([PlaceV1Schema, PlaceV1Schema]),
    preferredLines: PreferredLinesSchema,
  }),
  v.transform(({ places: [first, second], ...route }) => {
    const { reserve: firstReserve, ...origin } = first
    const { reserve: secondReserve, ...destination } = second
    return {
      ...route,
      places: [origin, destination] as const,
      buffer: Math.max(firstReserve, secondReserve),
    }
  }),
)

export const ROUTES_VERSION = 2

export const StoredRoutesSchema = v.variant('version', [
  v.object({ version: v.literal(ROUTES_VERSION), routes: v.array(RouteSchema) }),
  v.object({ version: v.literal(1), routes: v.array(RouteV1Schema) }),
])
