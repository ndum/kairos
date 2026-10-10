<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="brand-mark">
    <rect width="32" height="32" rx="10" class="tile" />
    <path d="M11 8v16M11 17 21 8M14 14.4 21.5 24" class="letter" />
    <circle cx="11" cy="17" r="2.6" class="pivot" />
  </svg>
</template>

<style scoped>
/* A white tile on the sky, in both appearances. */
.tile {
  fill: #ffffff;
}
.letter {
  fill: none;
  stroke: #3f52d4;
  stroke-width: 3;
  stroke-linecap: round;
}
.pivot {
  fill: #e08a2c;
}
</style>
