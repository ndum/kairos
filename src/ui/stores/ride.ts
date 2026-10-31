import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { type Ride, replacesRide, rideOf } from '@/application/ride'
import type { Direction, Route } from '@/domain/route'
import type { Instant } from '@/domain/time'
import type { Trip } from '@/domain/trip'

import { useServices } from '../services'
import { useDelayStore } from './delays'

/** The trip the user is probably on, kept on the device. */
export const useRideStore = defineStore('ride', () => {
  const { rides } = useServices()
  const ride = shallowRef<Ride | null>(rides.load())
  // The delays of the rides feed the punctuality of the lines.
  const delays = useDelayStore()

  /** Remembers the main trip of the board once the user is about to leave for it. */
  function follow(route: Route, direction: Direction, trip: Trip, now: Instant): void {
    if (!replacesRide(ride.value, trip, now)) return
    const previous = ride.value
    ride.value = rideOf(route, direction, trip)
    rides.save(ride.value)
    // The user did not leave for the previous ride, so its delays are none of theirs.
    if (previous && previous.key !== ride.value.key) {
      delays.discard(previous.routeId, previous.journey)
    }
    delays.observe(route.id, trip.journey)
  }

  /** Notes the latest delays of the ride while the user is on the way. */
  function observe(journey: Ride['journey']): void {
    if (ride.value) delays.observe(ride.value.routeId, journey)
  }

  /** Forgets the ride once it is over. */
  function forget(): void {
    if (ride.value === null) return
    ride.value = null
    rides.save(null)
  }

  /** Forgets a ride the user was not on, together with its delays. */
  function dismiss(): void {
    if (ride.value) delays.discard(ride.value.routeId, ride.value.journey)
    forget()
  }

  return { ride, follow, observe, forget, dismiss }
})
