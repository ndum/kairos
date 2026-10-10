import * as v from 'valibot'

import { StopSchema, TransportModeSchema } from './common-schemas'

const StopEventSchema = v.object({
  stop: StopSchema,
  scheduledAt: v.number(),
  expectedAt: v.optional(v.number()),
  platform: v.optional(v.string()),
  expectedPlatform: v.optional(v.string()),
})

const LineSchema = v.object({
  name: v.string(),
  mode: TransportModeSchema,
  headsign: v.optional(v.string()),
})

const LegSchema = v.variant('kind', [
  v.object({
    kind: v.literal('ride'),
    line: LineSchema,
    departure: StopEventSchema,
    arrival: StopEventSchema,
    cancelled: v.boolean(),
  }),
  v.object({
    kind: v.literal('walk'),
    from: StopSchema,
    to: StopSchema,
    duration: v.number(),
  }),
])

export const CACHE_VERSION = 1

export const JourneySchema = v.object({ legs: v.array(LegSchema) })

export const StoredJourneysSchema = v.object({
  version: v.literal(CACHE_VERSION),
  journeys: v.array(JourneySchema),
  fetchedAt: v.number(),
})
