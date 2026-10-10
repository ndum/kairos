<script setup lang="ts">
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
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
  /** The route to edit. Without it, the editor creates a new route. */
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
const card = useTemplateRef<InstanceType<typeof GlassCard>>('card')
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
  const field = card.value?.$el as HTMLElement | undefined
  field?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

function submit(): void {
  if (!isComplete(step.value)) {
    void showErrors()
    return
  }
  if (step.value < STEPS.length - 1) {
    void goTo(step.value + 1)
    return
  }

  const draft = draftOf(form)
  if (existing) store.update({ ...draft, id: existing.id })
  else store.add(draft)
  toasts.show(t('routes.saved', { name: draft.name.trim() }))
  void router.push({ name: 'routes' })
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

  <div v-else class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 tabindex="-1" class="text-3xl font-bold tracking-tight outline-none">
        {{ existing ? t('editor.editTitle') : t('editor.newTitle') }}
      </h1>
      <BaseButton variant="quiet" :to="{ name: 'routes' }">{{ t('editor.cancel') }}</BaseButton>
    </div>

    <nav :aria-label="t('editor.steps')">
      <ol class="grid grid-cols-3 gap-2">
        <li v-for="(name, index) in STEPS" :key="name">
          <button
            type="button"
            class="step-tab flex w-full flex-col gap-2 text-left text-sm font-semibold"
            :class="{ reached: index <= step }"
            :aria-current="index === step ? 'step' : undefined"
            :disabled="!isReachable(index)"
            @click="goTo(index)"
          >
            <span class="bar" aria-hidden="true" />
            {{ t(`editor.${name}.label`) }}
          </button>
        </li>
      </ol>
    </nav>

    <GlassCard
      ref="card"
      tag="form"
      :lift="false"
      novalidate
      class="flex flex-col gap-7"
      @submit.prevent="submit"
    >
      <header class="flex flex-col gap-1.5">
        <p class="text-sm font-semibold text-ink-subtle">
          {{ t('editor.step', { current: step + 1, total: STEPS.length }) }}
        </p>
        <h2 ref="heading" tabindex="-1" class="text-2xl font-semibold tracking-tight outline-none">
          {{ t(`editor.${current}.title`) }}
        </h2>
        <p class="text-pretty text-ink-muted">{{ t(`editor.${current}.text`) }}</p>
      </header>

      <Transition :name="`step-${direction}`" mode="out-in" @before-leave="deactivate">
        <PlaceStep
          v-if="current === 'origin'"
          key="origin"
          v-model="form.places[0]"
          :errors="attempted ? errors.places[0] : {}"
        />
        <PlaceStep
          v-else-if="current === 'destination'"
          key="destination"
          v-model="form.places[1]"
          :errors="attempted ? errors.places[1] : {}"
          :other-name="form.places[0].name"
        />
        <LineStep
          v-else-if="form.places[0].stop && form.places[1].stop"
          key="lines"
          v-model:lines="form.preferredLines"
          v-model:name="form.name"
          :stops="[form.places[0].stop, form.places[1].stop]"
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
  </div>
</template>

<style scoped>
.step-tab {
  color: var(--color-ink-subtle);
  transition: color 0.3s;
}

.step-tab.reached,
.step-tab[aria-current='step'] {
  color: var(--color-ink);
}

.step-tab:disabled {
  cursor: default;
}

.bar {
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--color-glass-soft);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
  transition: background-color 0.4s;
}

.reached .bar {
  background: var(--color-ink);
  box-shadow: none;
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
