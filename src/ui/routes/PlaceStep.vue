<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { NAME_MAX_LENGTH, RESERVE_MAX, WALK_MAX } from '@/domain/route-rules'
import { MINUTE } from '@/domain/time'

import MinuteField from '../components/MinuteField.vue'
import StopField from '../components/StopField.vue'
import TextField from '../components/TextField.vue'
import type { PlaceErrors, PlaceForm } from './route-form'

const place = defineModel<PlaceForm>({ required: true })

const props = defineProps<{
  errors: PlaceErrors
  /** Name of the other place, which is not offered again as a suggestion. */
  otherName?: string
}>()

const { t } = useI18n()

const SUGGESTIONS = ['home', 'work', 'school'] as const

const suggestions = computed(() =>
  SUGGESTIONS.map((key) => t(`editor.place.suggestions.${key}`)).filter(
    (name) => name !== props.otherName?.trim(),
  ),
)

const nameError = computed(() => {
  if (props.errors.name === 'missing') return t('editor.errors.nameMissing')
  if (props.errors.name === 'too-long')
    return t('editor.errors.nameTooLong', { max: NAME_MAX_LENGTH })
  return undefined
})

const stopError = computed(() => {
  if (props.errors.stop === 'missing') return t('editor.errors.stopMissing')
  if (props.errors.stop === 'same') return t('editor.errors.stopSame')
  return undefined
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <TextField
      v-model="place.name"
      :label="t('editor.place.name')"
      :placeholder="suggestions[0]"
      :error="nameError"
    >
      <div class="flex flex-wrap gap-2">
        <button
          v-for="name in suggestions"
          :key="name"
          type="button"
          class="suggestion rounded-full px-4 py-1.5 text-sm font-semibold"
          @click="place.name = name"
        >
          {{ name }}
        </button>
      </div>
    </TextField>

    <StopField
      v-model="place.stop"
      :label="t('editor.place.stop')"
      :placeholder="t('editor.place.stopPlaceholder')"
      :error="stopError"
    />

    <div class="grid gap-6 sm:grid-cols-2">
      <MinuteField
        v-model="place.walk"
        :label="t('editor.place.walk')"
        :hint="t('editor.place.walkHint')"
        :max="WALK_MAX / MINUTE"
      />
      <MinuteField
        v-model="place.reserve"
        :label="t('editor.place.reserve')"
        :hint="t('editor.place.reserveHint')"
        :max="RESERVE_MAX / MINUTE"
      />
    </div>
  </div>
</template>

<style scoped>
.suggestion {
  border: 1px solid var(--color-hairline);
  background: var(--color-glass-soft);
  color: var(--color-ink-muted);
  transition:
    background-color 0.2s,
    color 0.2s;
}

@media (hover: hover) {
  .suggestion:hover {
    background: var(--color-glass);
    color: var(--color-ink);
  }
}
</style>
