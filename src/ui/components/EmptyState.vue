<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import GlassCard from './GlassCard.vue'

defineProps<{
  icon: Component
  title: string
  text: string
  action?: { label: string; to: RouteLocationRaw }
}>()
</script>

<template>
  <GlassCard class="mx-auto flex max-w-xl flex-col items-start gap-4">
    <span class="grid size-12 place-items-center rounded-2xl bg-glass-soft text-2xl">
      <component :is="icon" aria-hidden="true" />
    </span>
    <h2 class="text-2xl font-semibold tracking-tight">{{ title }}</h2>
    <p class="text-base leading-relaxed text-ink-muted">{{ text }}</p>
    <RouterLink
      v-if="action"
      :to="action.to"
      class="glass inline-flex h-11 items-center gap-2 rounded-full px-5 font-semibold text-ink"
    >
      {{ action.label }}
    </RouterLink>
  </GlassCard>
</template>
