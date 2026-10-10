<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="brand-mark">
    <rect width="32" height="32" rx="10" class="tile" />
    <path d="M11 8v16M11 17 21 8M14 14.4 21.5 24" class="letter" />
    <circle cx="11" cy="17" r="2.6" class="pivot" />
  </svg>
</template>

<style scoped>
.brand-mark {
  filter: drop-shadow(0 6px 14px rgb(20 22 58 / 0.25));
}
.tile {
  fill: var(--color-ink);
}
.letter {
  fill: none;
  stroke: var(--color-scene-sky-2);
  stroke-width: 3;
  stroke-linecap: round;
}
.pivot {
  fill: var(--color-soon);
}
</style>
