<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCurrentLocation from '~icons/tabler/current-location'
import IconLoader from '~icons/tabler/loader-2'

import type { NearbyStop } from '@/application/place-finder'
import type { FoundPlace } from '@/application/ports/place-search'
import { distanceInMeters } from '@/domain/geo'
import type { StopRef } from '@/domain/route'
import { NAME_MAX_LENGTH, WALK_MAX } from '@/domain/route-rules'
import { MINUTE } from '@/domain/time'
import { estimateWalk } from '@/domain/walking'

import BaseButton from '../components/BaseButton.vue'
import MinuteField from '../components/MinuteField.vue'
import PlaceField from '../components/PlaceField.vue'
import StopField from '../components/StopField.vue'
import TextField from '../components/TextField.vue'
import { useFormat } from '../composables/use-format'
import { useServices } from '../services'
import type { PlaceErrors, PlaceForm } from './route-form'

const place = defineModel<PlaceForm>({ required: true })

const props = defineProps<{
  /** Whether the place is where the route starts or where it ends, for the walking text. */
  end: 'origin' | 'destination'
  errors: PlaceErrors
  /** Name of the other place, which is not offered again as a suggestion. */
  otherName?: string
}>()

const { t } = useI18n()
const format = useFormat()
const { location, places } = useServices()
const id = useId()

const SUGGESTIONS = ['home', 'work', 'school'] as const

// The place search shows addresses of swisstopo and companies from OpenStreetMap.
const SWISSTOPO = 'https://www.swisstopo.admin.ch'
const OPENSTREETMAP = 'https://www.openstreetmap.org/copyright'

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

// Where the place lies, found by address or company or taken from the current position. It
// stays on the device and leads to the stops nearby.
const found = ref<FoundPlace | null>(null)
const nearby = shallowRef<readonly NearbyStop[]>([])
const nearbyStatus = ref<'idle' | 'loading' | 'done' | 'failed'>('idle')
const locating = ref(false)
const positionMessage = ref('')
let controller: AbortController | null = null

async function loadNearby(): Promise<void> {
  controller?.abort()
  const position = place.value.coordinates
  if (!position) {
    nearby.value = []
    nearbyStatus.value = 'idle'
    return
  }
  const current = new AbortController()
  controller = current
  nearbyStatus.value = 'loading'
  try {
    nearby.value = await places.stopsNear(position, current.signal)
    nearbyStatus.value = 'done'
  } catch {
    if (!current.signal.aborted) nearbyStatus.value = 'failed'
  }
}

// When editing, the stops around the stored position show right away.
void loadNearby()
onScopeDispose(() => {
  controller?.abort()
})

watch(found, (value) => {
  if (!value) return
  place.value.coordinates = value.coordinates
  positionMessage.value = ''
  void loadNearby()
})

async function locate(): Promise<void> {
  locating.value = true
  const result = await location.current()
  locating.value = false
  positionMessage.value = t(`editor.place.position.${result.kind}`)
  if (result.kind !== 'found') return
  found.value = null
  place.value.coordinates = result.coordinates
  void loadNearby()
}

function forget(): void {
  place.value.coordinates = undefined
  found.value = null
  positionMessage.value = t('editor.place.position.removed')
  void loadNearby()
}

// The stop: one of those nearby, or any other found by its name.
const choosingOther = ref(false)
const showNearby = computed(() => nearbyStatus.value === 'done' && nearby.value.length > 0)
const isNearby = (stop: StopRef | null): boolean =>
  stop !== null && nearby.value.some((option) => option.stop.id === stop.id)
const showStopField = computed(
  () =>
    !showNearby.value ||
    choosingOther.value ||
    (place.value.stop !== null && !isNearby(place.value.stop)),
)

function chooseNearby(option: NearbyStop): void {
  choosingOther.value = false
  place.value.stop = option.stop
  place.value.walk = format.minutes(option.walk)
}

function chooseOther(): void {
  choosingOther.value = true
  if (isNearby(place.value.stop)) place.value.stop = null
}

/** A stop chosen by name gets its walk from the position of the place, if that is known. */
function chooseStop(stop: StopRef | null): void {
  place.value.stop = stop
  const position = place.value.coordinates
  if (stop?.coordinates && position) {
    place.value.walk = format.minutes(estimateWalk(distanceInMeters(position, stop.coordinates)))
  }
}
</script>

<template>
  <div class="flex flex-col gap-7">
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

    <div class="flex flex-col gap-3">
      <PlaceField
        v-model="found"
        :label="t('editor.place.where.label')"
        :hint="t('editor.place.where.hint')"
        :placeholder="t('editor.place.where.placeholder')"
      />
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton :disabled="locating" @click="locate">
          <IconCurrentLocation aria-hidden="true" />
          {{ t('editor.place.position.set') }}
        </BaseButton>
        <BaseButton v-if="place.coordinates" variant="quiet" @click="forget">
          {{ t('editor.place.position.remove') }}
        </BaseButton>
      </div>
      <p role="status" class="text-sm text-ink-muted" :class="{ 'sr-only': !positionMessage }">
        {{ positionMessage }}
      </p>
      <p class="credit text-xs text-ink-subtle">
        {{ t('editor.place.credit.addresses') }}
        <a :href="SWISSTOPO" target="_blank" rel="noopener noreferrer" v-text="'© swisstopo'" />.
        {{ t('editor.place.credit.companies') }}
        <a
          :href="OPENSTREETMAP"
          target="_blank"
          rel="noopener noreferrer"
          v-text="t('editor.place.credit.osm')"
        />.
      </p>
    </div>

    <div class="flex flex-col gap-3">
      <p
        v-if="nearbyStatus === 'loading'"
        class="flex items-center gap-2 text-ink-muted"
        aria-live="polite"
      >
        <IconLoader aria-hidden="true" class="animate-spin" />
        {{ t('editor.place.nearby.loading') }}
      </p>
      <div v-else-if="nearbyStatus === 'failed'" class="flex flex-col items-start gap-2">
        <p class="text-ink-muted">{{ t('editor.place.nearby.failed') }}</p>
        <BaseButton variant="quiet" @click="loadNearby">{{
          t('editor.place.nearby.retry')
        }}</BaseButton>
      </div>
      <p v-else-if="nearbyStatus === 'done' && nearby.length === 0" class="text-ink-muted">
        {{ t('editor.place.nearby.none') }}
      </p>

      <fieldset v-if="showNearby" class="flex flex-col gap-2">
        <legend class="mb-2 font-semibold">{{ t('editor.place.nearby.label') }}</legend>
        <label v-for="(option, index) in nearby" :key="option.stop.id" class="choice">
          <input
            type="radio"
            :name="id"
            :checked="!choosingOther && place.stop?.id === option.stop.id"
            :aria-invalid="stopError && !showStopField && index === 0 ? 'true' : undefined"
            :aria-describedby="stopError && !showStopField ? `${id}-error` : undefined"
            @change="chooseNearby(option)"
          />
          <span class="grid min-w-0">
            <span class="truncate font-semibold">{{ option.stop.name }}</span>
            <span class="text-sm text-ink-muted">
              {{
                t('editor.place.nearby.detail', {
                  distance: format.distance(option.distance),
                  minutes: format.minutes(option.walk),
                })
              }}
            </span>
          </span>
        </label>
        <label class="choice">
          <input type="radio" :name="id" :checked="showStopField" @change="chooseOther" />
          <span class="font-semibold">{{ t('editor.place.nearby.other') }}</span>
        </label>
        <p
          v-if="stopError && !showStopField"
          :id="`${id}-error`"
          class="text-sm font-medium text-late"
        >
          {{ stopError }}
        </p>
      </fieldset>

      <StopField
        v-if="showStopField"
        :model-value="place.stop"
        :label="t('editor.place.stop')"
        :placeholder="t('editor.place.stopPlaceholder')"
        :error="stopError"
        @update:model-value="chooseStop"
      />
    </div>

    <MinuteField
      v-model="place.walk"
      :label="t(`editor.place.walk.${end}`)"
      :hint="t(`editor.place.walkHint.${end}`)"
      :max="WALK_MAX / MINUTE"
    />
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

.credit a {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* A row per stop, which reacts as a whole like the radio button it holds. */
.choice {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.875rem;
  border: 1px solid var(--color-hairline);
  border-radius: 1rem;
  padding: 0.6rem 1rem;
  background: var(--color-glass-soft);
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.choice:has(input:checked) {
  border-color: var(--color-ink);
  background: var(--color-glass);
  box-shadow: inset 0 0 0 1px var(--color-ink);
}

.choice:has(input:focus-visible) {
  outline: 2px solid var(--color-train);
  outline-offset: 2px;
}

.choice input {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  accent-color: var(--color-ink);
}
</style>
