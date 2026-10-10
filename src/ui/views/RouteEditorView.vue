<script setup lang="ts">
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import IconCheck from '~icons/tabler/check'
import IconRouteOff from '~icons/tabler/route-off'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import GlassCard from '../components/GlassCard.vue'
import LineStep from '../routes/LineStep.vue'
import PlaceStep from '../routes/PlaceStep.vue'
import {
  type RouteForm,
  draftOf,
  emptyForm,
  formOf,
  nameError,
  placeErrors,
  suggestedName,
} from '../routes/route-form'
import { useRouteStore } from '../stores/routes'
import { useToastStore } from '../stores/toasts'

const props = defineProps<{
  /** The route to edit. Without it, the editor creates a new route in steps. */
  id?: string
}>()

const STEPS = ['origin', 'destination', 'lines'] as const

const { t } = useI18n()
const router = useRouter()
const store = useRouteStore()
const toasts = useToastStore()

const existing = props.id === undefined ? undefined : store.find(props.id)
const form = reactive<RouteForm>(existing ? formOf(existing) : emptyForm())
const step = ref(0)
const direction = ref<'forward' | 'back'>('forward')
const attempted = ref(false)
const renamed = ref(existing !== undefined)
const editor = useTemplateRef<HTMLElement>('editor')
const heading = useTemplateRef<HTMLHeadingElement>('heading')

// Names a new route after its places until the user picks a name.
watch(
  () => suggestedName(form),
  (name) => {
    if (!renamed.value) form.name = name
  },
  { immediate: true },
)

const errors = computed(() => ({
  places: [placeErrors(form, 0), placeErrors(form, 1)] as const,
  name: nameError(form),
}))

function isComplete(index: number): boolean {
  if (index === 0 || index === 1) return Object.keys(errors.value.places[index]).length === 0
  return errors.value.name === undefined
}

/** Steps can be visited once the ones before them are complete. */
const isReachable = (index: number): boolean =>
  STEPS.slice(0, index).every((_, before) => isComplete(before))

const current = computed(() => STEPS[step.value] ?? 'origin')
const stops = computed(() => {
  const [origin, destination] = form.places
  return origin.stop && destination.stop ? ([origin.stop, destination.stop] as const) : null
})

async function goTo(index: number): Promise<void> {
  direction.value = index < step.value ? 'back' : 'forward'
  step.value = index
  attempted.value = false
  await nextTick()
  heading.value?.focus()
}

/** The step on its way out stays visible for a moment, but must not take clicks or focus. */
function deactivate(element: Element): void {
  element.setAttribute('inert', '')
}

async function showErrors(): Promise<void> {
  attempted.value = true
  await nextTick()
  editor.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

function save(): void {
  const draft = draftOf(form)
  if (existing) store.update({ ...draft, id: existing.id })
  else store.add(draft)
  toasts.show(t('routes.saved', { name: draft.name.trim() }))
  void router.push({ name: 'routes' })
}

/** A new route moves on step by step and is saved after the last one. */
function submitStep(): void {
  if (!isComplete(step.value)) {
    void showErrors()
    return
  }
  if (step.value < STEPS.length - 1) void goTo(step.value + 1)
  else save()
}

/** An existing route is edited on one page and saved at once. */
function submitPage(): void {
  if (STEPS.every((_, index) => isComplete(index))) save()
  else void showErrors()
}
</script>

<template>
  <template v-if="id !== undefined && !existing">
    <h1 tabindex="-1" class="sr-only">{{ t('editor.editTitle') }}</h1>
    <EmptyState
      :icon="IconRouteOff"
      :title="t('editor.notFound.title')"
      :text="t('editor.notFound.text')"
      :action="{ label: t('editor.notFound.action'), to: { name: 'routes' } }"
    />
  </template>

  <div v-else ref="editor" class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 tabindex="-1" class="text-3xl font-bold tracking-tight outline-none">
        {{ existing ? t('editor.editTitle') : t('editor.newTitle') }}
      </h1>
      <BaseButton variant="quiet" :to="{ name: 'routes' }">{{ t('editor.cancel') }}</BaseButton>
    </div>

    <form v-if="existing" novalidate class="flex flex-col gap-5" @submit.prevent="submitPage">
      <GlassCard
        v-for="name in STEPS"
        :key="name"
        :lift="false"
        :aria-labelledby="`section-${name}`"
        class="flex flex-col gap-6"
      >
        <h2 :id="`section-${name}`" class="text-2xl font-semibold tracking-tight">
          {{ t(`editor.${name}.label`) }}
        </h2>
        <PlaceStep
          v-if="name === 'origin'"
          v-model="form.places[0]"
          end="origin"
          :errors="attempted ? errors.places[0] : {}"
        />
        <PlaceStep
          v-else-if="name === 'destination'"
          v-model="form.places[1]"
          end="destination"
          :errors="attempted ? errors.places[1] : {}"
          :other-name="form.places[0].name"
        />
        <LineStep
          v-else-if="stops"
          v-model:lines="form.preferredLines"
          v-model:buffer="form.buffer"
          v-model:name="form.name"
          :stops
          :name-error="attempted ? errors.name : undefined"
          @rename="renamed = true"
        />
        <p v-else class="text-ink-muted">{{ t('editor.missingStops') }}</p>
      </GlassCard>

      <div class="flex justify-end">
        <BaseButton variant="primary" type="submit">{{ t('editor.save') }}</BaseButton>
      </div>
    </form>

    <template v-else>
      <nav :aria-label="t('editor.steps')">
        <ol class="steps">
          <li v-for="(name, index) in STEPS" :key="name">
            <button
              type="button"
              class="step-tab"
              :class="{ done: index < step && isComplete(index) }"
              :aria-current="index === step ? 'step' : undefined"
              :disabled="!isReachable(index)"
              @click="goTo(index)"
            >
              <span class="number" aria-hidden="true">
                <IconCheck v-if="index < step && isComplete(index)" />
                <template v-else>{{ index + 1 }}</template>
              </span>
              <span class="sr-only">{{ t('editor.stepNumber', { number: index + 1 }) }}</span>
              {{ t(`editor.${name}.label`) }}
            </button>
          </li>
        </ol>
      </nav>

      <GlassCard
        tag="form"
        :lift="false"
        novalidate
        class="flex flex-col gap-7"
        @submit.prevent="submitStep"
      >
        <header class="flex flex-col gap-1.5">
          <p class="text-sm font-semibold text-ink-subtle">
            {{ t('editor.step', { current: step + 1, total: STEPS.length }) }}
          </p>
          <h2
            ref="heading"
            tabindex="-1"
            class="text-2xl font-semibold tracking-tight outline-none"
          >
            {{ t(`editor.${current}.title`) }}
          </h2>
          <p class="text-pretty text-ink-muted">{{ t(`editor.${current}.text`) }}</p>
        </header>

        <Transition :name="`step-${direction}`" mode="out-in" @before-leave="deactivate">
          <PlaceStep
            v-if="current === 'origin'"
            key="origin"
            v-model="form.places[0]"
            end="origin"
            :errors="attempted ? errors.places[0] : {}"
          />
          <PlaceStep
            v-else-if="current === 'destination'"
            key="destination"
            v-model="form.places[1]"
            end="destination"
            :errors="attempted ? errors.places[1] : {}"
            :other-name="form.places[0].name"
          />
          <LineStep
            v-else-if="stops"
            key="lines"
            v-model:lines="form.preferredLines"
            v-model:buffer="form.buffer"
            v-model:name="form.name"
            :stops
            :name-error="attempted ? errors.name : undefined"
            @rename="renamed = true"
          />
        </Transition>

        <div class="flex items-center justify-between gap-3 pt-1">
          <BaseButton v-if="step > 0" variant="quiet" @click="goTo(step - 1)">
            {{ t('editor.back') }}
          </BaseButton>
          <span v-else />
          <BaseButton variant="primary" type="submit">
            {{ current === 'lines' ? t('editor.save') : t('editor.next') }}
          </BaseButton>
        </div>
      </GlassCard>
    </template>
  </div>
</template>

<style scoped>
.steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

/*
 * A numbered button per step, which looks clickable as long as the step can be reached. On
 * phones the number sits above the name, so all three fit side by side.
 */
.step-tab {
  display: flex;
  width: 100%;
  min-height: 3rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border: 1px solid var(--color-hairline);
  border-radius: 1rem;
  padding: 0.5rem 0.25rem;
  background: var(--color-glass-soft);
  color: var(--color-ink-muted);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 650;
  text-align: center;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

@media (min-width: 640px) {
  .step-tab {
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.625rem;
    border-radius: 9999px;
    padding: 0.375rem 0.875rem 0.375rem 0.375rem;
    font-size: 0.9375rem;
    text-align: left;
  }
}

.step-tab:not(:disabled):hover {
  border-color: var(--color-ink-subtle);
  background: var(--color-glass);
  color: var(--color-ink);
}

.step-tab:focus-visible {
  outline: 2px solid var(--color-train);
  outline-offset: 2px;
}

.step-tab[aria-current='step'] {
  border-color: var(--color-ink);
  background: var(--color-glass);
  color: var(--color-ink);
}

.step-tab:disabled {
  cursor: default;
  opacity: 0.55;
}

.number {
  display: grid;
  width: 2.125rem;
  height: 2.125rem;
  flex: none;
  place-items: center;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px currentColor;
  font-variant-numeric: tabular-nums;
}

.step-tab[aria-current='step'] .number {
  background: var(--color-ink);
  box-shadow: none;
  color: var(--color-on-ink);
}

.step-tab.done .number {
  background: var(--color-go);
  box-shadow: none;
  color: var(--color-on-vehicle);
}

.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition:
    opacity 0.2s,
    transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.step-forward-leave-active,
.step-back-leave-active {
  pointer-events: none;
}

.step-forward-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}

.step-forward-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-1.5rem);
}
</style>
