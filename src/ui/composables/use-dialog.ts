import { ref } from 'vue'

/** State of a dialog that is only rendered once it has been opened for the first time. */
export function useDialog() {
  const open = ref(false)
  const used = ref(false)

  function show(): void {
    used.value = true
    open.value = true
  }

  return { open, used, show }
}
