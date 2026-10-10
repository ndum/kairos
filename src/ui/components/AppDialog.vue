<script setup lang="ts">
import { onMounted, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconX from '~icons/tabler/x'

import IconButton from './IconButton.vue'

// A modal dialog on top of the native <dialog> element, which traps the focus, closes with
// Escape and makes the rest of the page inert. It opens as a sheet from the bottom on phones,
// and in the middle of larger screens or, for longer content, at their right edge.

const open = defineModel<boolean>('open', { required: true })

withDefaults(defineProps<{ title: string; placement?: 'center' | 'side' }>(), {
  placement: 'center',
})

const { t } = useI18n()
const titleId = useId()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

function sync(isOpen: boolean): void {
  const element = dialog.value
  if (!element) return
  if (isOpen && !element.open) element.showModal()
  if (!isOpen && element.open) element.close()
}

watch(open, sync, { flush: 'post' })
onMounted(() => {
  sync(open.value)
})

/** Clicks on the backdrop reach the dialog element, but outside of its box. */
function closeOnBackdrop(event: MouseEvent): void {
  const element = dialog.value
  if (!element || event.target !== element) return
  const box = element.getBoundingClientRect()
  const inside =
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  if (!inside) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog"
    :class="placement"
    :aria-labelledby="titleId"
    @close="open = false"
    @click="closeOnBackdrop"
  >
    <div class="flex items-start justify-between gap-4">
      <h2 :id="titleId" class="pt-1.5 text-2xl font-semibold tracking-tight text-balance">
        {{ title }}
      </h2>
      <IconButton class="-mt-1 -mr-2" :label="t('dialog.close')" @click="open = false">
        <IconX aria-hidden="true" />
      </IconButton>
    </div>
    <slot />
  </dialog>
</template>

<style scoped>
.app-dialog {
  position: fixed;
  width: 100%;
  max-width: 34rem;
  max-height: calc(100dvh - 3.25rem);
  margin: auto auto 0;
  overflow-y: auto;
  border: none;
  border-radius: 1.75rem 1.75rem 0 0;
  padding: 1.25rem 1rem calc(env(safe-area-inset-bottom, 0px) + 2rem);
  background: var(--color-sheet);
  box-shadow: var(--shadow-sheet);
  color: var(--color-ink);
  /* A dialog opened from the header on the sky must not take over its text shadow. */
  text-shadow: none;
  overscroll-behavior: contain;
  opacity: 0;
  translate: 0 2rem;
  transition:
    opacity 0.25s,
    translate 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
    overlay 0.4s allow-discrete,
    display 0.4s allow-discrete;
}

.app-dialog[open] {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  opacity: 1;
  translate: 0 0;
}

.app-dialog::backdrop {
  background: rgb(8 10 36 / 0);
  -webkit-backdrop-filter: blur(0);
  backdrop-filter: blur(0);
  transition:
    background-color 0.3s,
    backdrop-filter 0.3s,
    overlay 0.4s allow-discrete,
    display 0.4s allow-discrete;
}

.app-dialog[open]::backdrop {
  background: rgb(8 10 36 / 0.4);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

@starting-style {
  .app-dialog[open] {
    opacity: 0;
    translate: 0 2rem;
  }

  .app-dialog[open]::backdrop {
    background: rgb(8 10 36 / 0);
    -webkit-backdrop-filter: blur(0);
    backdrop-filter: blur(0);
  }
}

@media (min-width: 640px) {
  .app-dialog {
    margin: auto;
    border-radius: var(--radius-card);
    padding: 1.75rem;
  }
}

/* At the right edge of large screens, the page stays in view next to the dialog. */
@media (min-width: 900px) {
  .app-dialog.side {
    width: 27.5rem;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0 0 0 auto;
    border-radius: 0;
    padding: 1.5rem 1.375rem 2rem;
    box-shadow: -18px 0 50px rgb(10 11 30 / 0.25);
    translate: 2rem 0;
  }

  .app-dialog.side[open] {
    translate: 0 0;
  }

  @starting-style {
    .app-dialog.side[open] {
      translate: 2rem 0;
    }
  }
}
</style>
