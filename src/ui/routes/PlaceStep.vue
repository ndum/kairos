<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCurrentLocation from '~icons/tabler/current-location'

import { NAME_MAX_LENGTH, RESERVE_MAX, WALK_MAX } from '@/domain/route-rules'
import { MINUTE } from '@/domain/time'

import BaseButton from '../components/BaseButton.vue'
import MinuteField from '../components/MinuteField.vue'
import StopField from '../components/StopField.vue'
import TextField from '../components/TextField.vue'
import { useLocationPreference } from '../composables/use-location-preference'
import { useServices } from '../services'
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

// With the direction chosen by position, the position of the place itself is more exact than
// the one of its stop. It is only offered when the user allows using the position.
const useLocation = useLocationPreference()
const { location } = useServices()
const locating = ref(false)
const locationMessage = ref('')

async function locate(): Promise<void> {
  locating.value = true
  const result = await location.current()
  locating.value = false
  if (result.kind === 'found') place.value.coordinates = result.coordinates
  locationMessage.value = t(`editor.place.position.${result.kind}`)
}

function forget(): void {
  place.value.coordinates = undefined
  locationMessage.value = t('editor.place.position.removed')
}

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

    <div v-if="useLocation" class="flex flex-col gap-2">
      <p class="font-semibold">{{ t('editor.place.position.label') }}</p>
      <p class="text-sm text-pretty text-ink-subtle">{{ t('editor.place.position.hint') }}</p>
      <div class="flex flex-wrap gap-2">
        <BaseButton :disabled="locating" @click="locate">
          <IconCurrentLocation aria-hidden="true" />
          {{
            place.coordinates ? t('editor.place.position.update') : t('editor.place.position.set')
          }}
        </BaseButton>
        <BaseButton v-if="place.coordinates" variant="quiet" @click="forget">
          {{ t('editor.place.position.remove') }}
        </BaseButton>
      </div>
      <p role="status" class="text-sm text-ink-muted" :class="{ 'sr-only': !locationMessage }">
        {{ locationMessage }}
      </p>
    </div>

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
