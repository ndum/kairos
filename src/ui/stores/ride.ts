import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { type Ride, replacesRide, rideOf } from '@/application/ride'
import type { Direction, Route } from '@/domain/route'
import type { Instant } from '@/domain/time'
import type { Trip } from '@/domain/trip'

import { useServices } from '../services'

/** The trip the user is probably on, kept on the device. */
export const useRideStore = defineStore('ride', () => {
  const { rides } = useServices()
  const ride = shallowRef<Ride | null>(rides.load())

  /** Remembers the main trip of the board once the user is about to leave for it. */
  function follow(route: Route, direction: Direction, trip: Trip, now: Instant): void {
    if (!replacesRide(ride.value, trip, now)) return
    ride.value = rideOf(route, direction, trip)
    rides.save(ride.value)
  }

  function forget(): void {
    if (ride.value === null) return
    ride.value = null
    rides.save(null)
  }

  return { ride, follow, forget }
})
