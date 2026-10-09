<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'
import IconCheck from '~icons/tabler/check'
import IconLoader from '~icons/tabler/loader-2'

import { type LineOptions, findLineOptions } from '@/application/line-options'
import { lineKey, usesPreferredLines } from '@/domain/line-preference'
import type { PreferredLine, StopRef } from '@/domain/route'
import { NAME_MAX_LENGTH } from '@/domain/route-rules'

import BaseButton from '../components/BaseButton.vue'
import LineBadge from '../components/LineBadge.vue'
import TextField from '../components/TextField.vue'
import { useServices } from '../services'
import type { NameError } from './route-form'

const lines = defineModel<PreferredLine[]>('lines', { required: true })
const name = defineModel<string>('name', { required: true })

const props = defineProps<{
  stops: readonly [StopRef, StopRef]
  nameError?: NameError
}>()

const emit = defineEmits<{ rename: [] }>()

const { t } = useI18n()
const { timetable, clock } = useServices()

const options = shallowRef<LineOptions | null>(null)
const status = ref<'loading' | 'done' | 'failed'>('loading')
let controller: AbortController | null = null

async function load(): Promise<void> {
  controller?.abort()
  const current = new AbortController()
  controller = current
  status.value = 'loading'
  try {
    options.value = await findLineOptions(timetable, props.stops, clock.now(), current.signal)
    status.value = 'done'
  } catch {
    if (!current.signal.aborted) status.value = 'failed'
  }
}

void load()
onScopeDispose(() => {
  controller?.abort()
})

const sameLine = (a: PreferredLine, b: PreferredLine): boolean =>
  lineKey(a.name) === lineKey(b.name)

const isChosen = (line: PreferredLine): boolean =>
  lines.value.some((other) => sameLine(line, other))

/** Suggested lines, followed by chosen lines the next journeys do not use, such as night lines. */
const choices = computed<PreferredLine[]>(() => {
  const suggested = (options.value?.lines ?? []).map(({ name: lineName, mode }) => ({
    name: lineName,
    mode,
  }))
  return [...suggested, ...lines.value.filter((line) => !suggested.some((s) => sameLine(s, line)))]
})

const usage = (line: PreferredLine): number =>
  options.value?.lines.find((suggested) => sameLine(suggested, line))?.journeys ?? 0

/** Keeps the chosen lines in the order of the choices, which follows the trip. */
function toggle(line: PreferredLine): void {
  const chosen = !isChosen(line)
  lines.value = choices.value.filter((choice) =>
    sameLine(choice, line) ? chosen : isChosen(choice),
  )
}

const summary = computed(() => {
  if (status.value !== 'done' || !options.value) return null
  const { journeys } = options.value
  if (journeys.length === 0) return { text: t('editor.lines.none'), warning: false }
  if (lines.value.length === 0) return { text: t('editor.lines.all'), warning: false }

  const names = lines.value.map((line) => line.name)
  const count = journeys.filter((journey) => usesPreferredLines(journey, names)).length
  if (count === 0) return { text: t('editor.lines.uncovered'), warning: true }
  return { text: t('editor.lines.coverage', { count, total: journeys.length }), warning: false }
})

const nameErrorText = computed(() => {
  if (props.nameError === 'missing') return t('editor.errors.nameMissing')
  if (props.nameError === 'too-long')
    return t('editor.errors.nameTooLong', { max: NAME_MAX_LENGTH })
  return undefined
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-4" :aria-busy="status === 'loading'">
      <p v-if="status === 'loading'" class="flex items-center gap-2 text-ink-muted">
        <IconLoader aria-hidden="true" class="animate-spin" />
        {{ t('editor.lines.loading') }}
      </p>
      <div v-else-if="status === 'failed'" class="flex flex-col items-start gap-3">
        <p class="text-ink-muted">{{ t('editor.lines.failed') }}</p>
        <BaseButton @click="load">{{ t('editor.lines.retry') }}</BaseButton>
      </div>

      <fieldset v-if="choices.length > 0" class="flex flex-wrap gap-2">
        <legend class="sr-only">{{ t('editor.lines.label') }}</legend>
        <button
          v-for="line in choices"
          :key="line.name"
          type="button"
          class="chip"
          :aria-pressed="isChosen(line)"
          @click="toggle(line)"
        >
          <LineBadge :name="line.name" :mode="line.mode" />
          <span v-if="status === 'done'" class="text-sm text-ink-muted">
            {{ t('editor.lines.journeys', usage(line)) }}
          </span>
          <IconCheck aria-hidden="true" class="check" />
        </button>
      </fieldset>

      <p
        v-if="summary"
        role="status"
        class="flex gap-2 text-pretty"
        :class="summary.warning ? 'font-medium' : 'text-ink-muted'"
      >
        <IconAlertTriangle
          v-if="summary.warning"
          aria-hidden="true"
          class="mt-0.5 flex-none text-soon"
        />
        {{ summary.text }}
      </p>
    </div>

    <TextField
      v-model="name"
      :label="t('editor.lines.name')"
      :error="nameErrorText"
      @update:model-value="emit('rename')"
    />
  </div>
</template>

<style scoped>
.chip {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.625rem;
  border: 1px solid var(--color-hairline);
  border-radius: 9999px;
  padding: 0.375rem 0.875rem 0.375rem 0.5rem;
  background: var(--color-glass-soft);
  transition:
    background-color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.chip[aria-pressed='true'] {
  border-color: var(--color-ink);
  background: var(--color-glass);
  box-shadow: inset 0 0 0 1px var(--color-ink);
}

.check {
  display: none;
  color: var(--color-ink);
}

.chip[aria-pressed='true'] .check {
  display: block;
}
</style>
