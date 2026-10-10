<script setup lang="ts">
withDefaults(defineProps<{ tag?: string }>(), { tag: 'section' })
</script>

<template>
  <component :is="tag" class="card glass rounded-card">
    <slot />
  </component>
</template>

<style scoped>
.card {
  min-width: 0;
  padding: 1.25rem;
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}

@media (min-width: 900px) {
  .card {
    padding: 1.75rem;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}
</style>
