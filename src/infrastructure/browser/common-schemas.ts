import * as v from 'valibot'

// Mirrors the domain types. Optional fields are left out by JSON.stringify, so they are
// optional here rather than nullable.

export const CoordinatesSchema = v.object({ latitude: v.number(), longitude: v.number() })

export const TransportModeSchema = v.picklist(['train', 'tram', 'bus', 'ship', 'cableway', 'other'])

export const StopSchema = v.object({
  id: v.string(),
  name: v.string(),
  coordinates: v.optional(CoordinatesSchema),
})
