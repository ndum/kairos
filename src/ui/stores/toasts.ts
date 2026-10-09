import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export interface ToastAction {
  readonly label: string
  readonly run: () => void
}

export interface Toast {
  readonly id: number
  readonly message: string
  readonly action?: ToastAction
}

/** Short confirmations at the bottom of the screen. A new one replaces the current one. */
export const useToastStore = defineStore('toasts', () => {
  const current = shallowRef<Toast | null>(null)
  let nextId = 1

  function show(message: string, action?: ToastAction): void {
    current.value = { id: nextId++, message, action }
  }

  function dismiss(id: number): void {
    if (current.value?.id === id) current.value = null
  }

  return { current, show, dismiss }
})
