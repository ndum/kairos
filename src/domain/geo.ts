export interface Coordinates {
  readonly latitude: number
  readonly longitude: number
}

const EARTH_RADIUS_METERS = 6_371_008.8

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** Great-circle distance between two points, using the haversine formula. */
export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const deltaLatitude = toRadians(b.latitude - a.latitude)
  const deltaLongitude = toRadians(b.longitude - a.longitude)
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine))
}
