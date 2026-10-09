import * as v from 'valibot'

// Mirrors the domain types. Optional fields are left out by JSON.stringify, so they are
// optional here rather than nullable.

const CoordinatesSchema = v.object({ latitude: v.number(), longitude: v.number() })

const StopSchema = v.object({
  id: v.string(),
  name: v.string(),
  coordinates: v.optional(CoordinatesSchema),
})

const StopEventSchema = v.object({
  stop: StopSchema,
  scheduledAt: v.number(),
  expectedAt: v.optional(v.number()),
  platform: v.optional(v.string()),
  expectedPlatform: v.optional(v.string()),
})

const LineSchema = v.object({
  name: v.string(),
  mode: v.picklist(['train', 'tram', 'bus', 'ship', 'cableway', 'other']),
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

export const StoredJourneysSchema = v.object({
  version: v.literal(CACHE_VERSION),
  journeys: v.array(v.object({ legs: v.array(LegSchema) })),
  fetchedAt: v.number(),
})
