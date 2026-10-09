import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { Instant } from '@/domain/time'
import type { Urgency } from '@/domain/urgency'

export interface SceneState {
  readonly urgency: Urgency | null
  readonly stationName: string | null
  readonly departureAt: Instant | null
}

/** What the panorama behind the app shows: the glow of the urgency and the arriving train. */
export const useSceneStore = defineStore('scene', () => {
  const urgency = ref<Urgency | null>(null)
  const stationName = ref<string | null>(null)
  const departureAt = ref<Instant | null>(null)

  function show(state: SceneState): void {
    urgency.value = state.urgency
    stationName.value = state.stationName
    departureAt.value = state.departureAt
  }

  function clear(): void {
    show({ urgency: null, stationName: null, departureAt: null })
  }

  return { urgency, stationName, departureAt, show, clear }
})
