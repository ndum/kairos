import { defineStore } from 'pinia'
import { ref } from 'vue'

/** What the title of the page tells before the name of the app, such as the time until leaving. */
export const useTitleStore = defineStore('title', () => {
  const status = ref<string | null>(null)

  return { status }
})
