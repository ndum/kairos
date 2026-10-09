import * as v from 'valibot'

// Only the fields Kairos requests (see FIELDS in the adapter). Everything is nullable in
// the Transport API, so the mapping decides which gaps are acceptable.

const CoordinateSchema = v.object({
  /** Latitude. The API calls it x. */
  x: v.nullish(v.number()),
  /** Longitude. The API calls it y. */
  y: v.nullish(v.number()),
})

export const StationSchema = v.object({
  id: v.nullish(v.string()),
  name: v.nullish(v.string()),
  coordinate: v.nullish(CoordinateSchema),
})

const PrognosisSchema = v.object({
  platform: v.nullish(v.string()),
  departure: v.nullish(v.string()),
  arrival: v.nullish(v.string()),
})

const CheckpointSchema = v.object({
  station: StationSchema,
  departureTimestamp: v.nullish(v.number()),
  arrivalTimestamp: v.nullish(v.number()),
  delay: v.nullish(v.number()),
  platform: v.nullish(v.string()),
  prognosis: v.nullish(PrognosisSchema),
})

const SectionSchema = v.object({
  journey: v.nullish(
    v.object({
      category: v.nullish(v.string()),
      number: v.nullish(v.string()),
      to: v.nullish(v.string()),
      operator: v.nullish(v.string()),
    }),
  ),
  walk: v.nullish(v.object({ duration: v.nullish(v.number()) })),
  departure: CheckpointSchema,
  arrival: CheckpointSchema,
})

export const ConnectionsResponseSchema = v.object({
  connections: v.array(v.object({ sections: v.array(SectionSchema) })),
})

export const LocationsResponseSchema = v.object({
  stations: v.array(StationSchema),
})

export type ApiStation = v.InferOutput<typeof StationSchema>
export type ApiSection = v.InferOutput<typeof SectionSchema>
export type ApiConnection = v.InferOutput<typeof ConnectionsResponseSchema>['connections'][number]
export type ApiCheckpoint = ApiSection['departure']
