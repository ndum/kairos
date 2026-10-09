import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { type PinnedTrip, journeyKey, pinTrip } from '@/application/pinned-trip'
import type { Direction, Route } from '@/domain/route'
import type { Trip } from '@/domain/trip'

import { useServices } from '../services'

/** The one trip the user has pinned from the planning, kept on the device. */
export const usePinStore = defineStore('pin', () => {
  const { pins } = useServices()
  const pinned = shallowRef<PinnedTrip | null>(pins.load())

  function pin(route: Route, direction: Direction, trip: Trip): void {
    pinned.value = pinTrip(route, direction, trip)
    pins.save(pinned.value)
  }

  function unpin(): void {
    pinned.value = null
    pins.save(null)
  }

  const isPinned = (trip: Trip): boolean => pinned.value?.key === journeyKey(trip.journey)

  return { pinned, pin, unpin, isPinned }
})
