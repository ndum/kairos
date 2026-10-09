import * as v from 'valibot'

import { CoordinatesSchema, StopSchema, TransportModeSchema } from './common-schemas'

const PlaceSchema = v.object({
  name: v.string(),
  stop: StopSchema,
  walk: v.number(),
  reserve: v.number(),
  coordinates: v.optional(CoordinatesSchema),
})

export const RouteSchema = v.object({
  id: v.string(),
  name: v.string(),
  places: v.tuple([PlaceSchema, PlaceSchema]),
  preferredLines: v.array(v.object({ name: v.string(), mode: TransportModeSchema })),
})

export const ROUTES_VERSION = 1

export const StoredRoutesSchema = v.object({
  version: v.literal(ROUTES_VERSION),
  routes: v.array(RouteSchema),
})
