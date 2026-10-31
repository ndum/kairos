import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import type { Journey } from '@/domain/journey'
import { type DelayRecord, mergeRecords, recordsOf, withoutJourney } from '@/domain/punctuality'

import { useServices } from '../services'

/** The delays of the rides the user took, kept on the device for the punctuality of lines. */
export const useDelayStore = defineStore('delays', () => {
  const { delays, clock } = useServices()
  const records = shallowRef<DelayRecord[]>(delays.load())

  /** Notes the delays of a ride as they are known now. Later notes of it replace earlier ones. */
  function observe(routeId: string, journey: Journey): void {
    records.value = mergeRecords(records.value, recordsOf(routeId, journey), clock.now())
    delays.save(records.value)
  }

  /** Forgets a ride the user was not on. */
  function discard(routeId: string, journey: Journey): void {
    records.value = withoutJourney(records.value, routeId, journey)
    delays.save(records.value)
  }

  return { records, observe, discard }
})
