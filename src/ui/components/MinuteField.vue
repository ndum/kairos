<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconMinus from '~icons/tabler/minus'
import IconPlus from '~icons/tabler/plus'

const model = defineModel<number>({ required: true })

const props = defineProps<{
  label: string
  hint?: string
  /** Largest number of minutes. */
  max: number
}>()

const { t } = useI18n()
const id = useId()

const clamp = (minutes: number): number => Math.min(Math.max(Math.round(minutes), 0), props.max)

function step(delta: number): void {
  model.value = clamp(model.value + delta)
}

function enter(event: Event): void {
  const input = event.target as HTMLInputElement
  const minutes = Number.parseInt(input.value, 10)
  model.value = Number.isNaN(minutes) ? model.value : clamp(minutes)
  // Shows the clamped value even when the model did not change.
  input.value = String(model.value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="font-semibold">
      {{ label }} <span class="sr-only">{{ t('field.inMinutes') }}</span>
    </label>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="stepper glass"
        :aria-label="t('field.lessMinutes', { label })"
        :disabled="model <= 0"
        @click="step(-1)"
      >
        <IconMinus aria-hidden="true" />
      </button>
      <div class="relative">
        <input
          :id
          :value="model"
          type="text"
          inputmode="numeric"
          maxlength="2"
          class="field w-24 pr-12 text-center font-semibold tabular-nums"
          :aria-describedby="hint ? `${id}-hint` : undefined"
          @change="enter"
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-subtle"
        >
          {{ t('field.minutesShort') }}
        </span>
      </div>
      <button
        type="button"
        class="stepper glass"
        :aria-label="t('field.moreMinutes', { label })"
        :disabled="model >= max"
        @click="step(1)"
      >
        <IconPlus aria-hidden="true" />
      </button>
    </div>
    <p v-if="hint" :id="`${id}-hint`" class="text-sm text-ink-subtle">{{ hint }}</p>
  </div>
</template>

<style scoped>
.stepper {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border-radius: var(--radius-inner);
  color: var(--color-ink);
  font-size: 1.25rem;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.stepper:active {
  transform: scale(0.94);
}

.stepper:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
