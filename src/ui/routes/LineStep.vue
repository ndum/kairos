<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'
import IconCheck from '~icons/tabler/check'
import IconChevronRight from '~icons/tabler/chevron-right'
import IconLoader from '~icons/tabler/loader-2'

import { type LineOptions, findLineOptions } from '@/application/line-options'
import { lineKey, usesPreferredLines } from '@/domain/line-preference'
import type { PreferredLine, StopRef } from '@/domain/route'
import { BUFFER_MAX, NAME_MAX_LENGTH } from '@/domain/route-rules'
import { MINUTE } from '@/domain/time'
import { type Variant, linesOfVariant, mainVariants, prefersVariant } from '@/domain/variants'

import BaseButton from '../components/BaseButton.vue'
import LineBadge from '../components/LineBadge.vue'
import MinuteField from '../components/MinuteField.vue'
import TextField from '../components/TextField.vue'
import { useServices } from '../services'
import type { NameError } from './route-form'

const lines = defineModel<PreferredLine[]>('lines', { required: true })
/** Minutes kept when leaving either place. */
const buffer = defineModel<number>('buffer', { required: true })
const name = defineModel<string>('name', { required: true })

const props = defineProps<{
  stops: readonly [StopRef, StopRef]
  nameError?: NameError
}>()

const emit = defineEmits<{ rename: [] }>()

const { t } = useI18n()
const { timetable, clock } = useServices()
const id = useId()

/** Variants offered at most. The others remain available as own lines. */
const MAX_VARIANTS = 4

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

// The user either takes the fastest connection on any line, one of the fastest variants, or
// picks lines one by one.
const pickingLines = ref(false)
const variants = computed(() => mainVariants(options.value?.variants ?? [], MAX_VARIANTS))
const sampled = computed(() =>
  (options.value?.variants ?? []).reduce((sum, variant) => sum + variant.journeys, 0),
)
const selection = computed<'fastest' | 'custom' | number>(() => {
  if (pickingLines.value) return 'custom'
  if (lines.value.length === 0) return 'fastest'
  const index = variants.value.findIndex((variant) => prefersVariant(lines.value, variant))
  return index >= 0 ? index : 'custom'
})

function chooseFastest(): void {
  pickingLines.value = false
  lines.value = []
}

function chooseVariant(variant: Variant): void {
  pickingLines.value = false
  lines.value = linesOfVariant(variant)
}

function chooseOwnLines(): void {
  pickingLines.value = true
}

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
  if (status.value !== 'done' || !options.value || selection.value === 'fastest') return null
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

      <fieldset class="flex flex-col gap-2">
        <legend class="sr-only">{{ t('editor.lines.choice') }}</legend>
        <label class="choice">
          <input
            type="radio"
            :name="id"
            :checked="selection === 'fastest'"
            @change="chooseFastest"
          />
          <span class="grid gap-0.5">
            <span class="flex flex-wrap items-center gap-2 font-semibold">
              {{ t('editor.lines.fastest.title') }}
              <span class="tag">{{ t('editor.lines.recommended') }}</span>
            </span>
            <span class="text-sm text-ink-muted">{{ t('editor.lines.fastest.text') }}</span>
          </span>
        </label>
        <label v-for="(variant, index) in variants" :key="index" class="choice">
          <input
            type="radio"
            :name="id"
            :checked="selection === index"
            @change="chooseVariant(variant)"
          />
          <span class="grid gap-1.5">
            <span class="flex flex-wrap items-center gap-1">
              <template v-for="(line, position) in variant.lines" :key="position">
                <template v-if="position > 0">
                  <IconChevronRight aria-hidden="true" class="text-ink-subtle" />
                  <span class="sr-only"> {{ t('editor.lines.then') }} </span>
                </template>
                <LineBadge :name="line.name" :mode="line.mode" />
              </template>
            </span>
            <span class="text-sm text-ink-muted">
              {{
                t('editor.lines.variant', {
                  count: variant.journeys,
                  total: sampled,
                  minutes: Math.round(variant.duration / MINUTE),
                })
              }}
            </span>
          </span>
        </label>
        <label class="choice">
          <input
            type="radio"
            :name="id"
            :checked="selection === 'custom'"
            @change="chooseOwnLines"
          />
          <span class="grid gap-0.5">
            <span class="font-semibold">{{ t('editor.lines.own.title') }}</span>
            <span class="text-sm text-ink-muted">{{ t('editor.lines.own.text') }}</span>
          </span>
        </label>
      </fieldset>

      <fieldset v-if="selection === 'custom' && choices.length > 0" class="flex flex-wrap gap-2">
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

    <MinuteField
      v-model="buffer"
      :label="t('editor.buffer.label')"
      :hint="t('editor.buffer.hint')"
      :max="BUFFER_MAX / MINUTE"
    />
    <TextField
      v-model="name"
      :label="t('editor.lines.name')"
      :error="nameErrorText"
      @update:model-value="emit('rename')"
    />
  </div>
</template>

<style scoped>
/* A row per choice, which reacts as a whole like the radio button it holds. */
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

.tag {
  border-radius: 9999px;
  padding: 0.1rem 0.6rem;
  background: var(--color-go);
  color: var(--color-on-vehicle);
  font-size: 0.75rem;
  font-weight: 700;
}

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
