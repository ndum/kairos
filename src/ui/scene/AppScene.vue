<script setup lang="ts">
import { useEventListener, useIntervalFn, useRafFn } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import type { Instant } from '@/domain/time'
import type { Urgency } from '@/domain/urgency'

import TrainSprite from './TrainSprite.vue'
import { OFFSTAGE_LEFT, STATION_X, TRAIN_LENGTH, isTrainMoving, trainOffset } from './train-motion'

const props = withDefaults(
  defineProps<{
    urgency?: Urgency | null
    /** Name on the station sign, usually the stop where the next train departs. */
    stationName?: string | null
    /** Departure of that train, which drives its arrival in the scene. */
    departureAt?: Instant | null
    /** Freezes every movement, from the system setting or the app setting. */
    still?: boolean
  }>(),
  { urgency: null, stationName: null, departureAt: null, still: false },
)

const FAR_RIDGE =
  'M0 312 L110 284 L210 252 L292 268 L372 226 L452 244 L548 196 L628 210 L700 152 L752 188 L836 172 L912 204 L996 162 L1046 120 L1086 172 L1136 142 L1198 110 L1246 152 L1302 132 L1378 96 L1436 142 L1500 172 L1578 150 L1656 192 L1738 166 L1798 158 L1858 192 L1938 176 L2018 216 L2098 202 L2196 240 L2296 232 L2400 262 L2400 420 L0 420 Z'
const MID_RIDGE =
  'M0 336 C180 306 330 328 500 304 S820 282 1010 312 S1320 292 1510 306 S1900 284 2100 300 S2320 312 2400 296 L2400 420 L0 420 Z'
const NEAR_RIDGE =
  'M0 362 C300 346 600 356 900 349 S1500 353 1800 347 S2200 355 2400 351 L2400 420 L0 420 Z'
const MASTS = Array.from({ length: 11 }, (_, index) => 40 + index * 230)

const stars = Array.from({ length: 110 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 58,
  duration: 2 + Math.random() * 4,
  delay: -Math.random() * 5,
  scale: 0.6 + Math.random() * 0.9,
}))

const now = ref(Date.now())
useIntervalFn(() => {
  now.value = Date.now()
}, 1000)

const offset = ref(OFFSTAGE_LEFT)
const trail = ref(0)
const moving = computed(() => !props.still && isTrainMoving(props.departureAt, now.value))

function placeTrain(): void {
  const next = props.still ? STATION_X - TRAIN_LENGTH : trainOffset(props.departureAt, Date.now())
  trail.value = Math.min(1, Math.max(0, (Math.abs(next - offset.value) - 1.5) / 10))
  offset.value = next
}

const frames = useRafFn(placeTrain, { immediate: false })
watch(
  moving,
  (isMoving) => {
    if (isMoving) frames.resume()
    else {
      frames.pause()
      placeTrain()
    }
  },
  { immediate: true },
)
watch(() => [props.departureAt, props.still, now.value], placeTrain)

const parallax = ref(0)
useEventListener(
  window,
  'pointermove',
  (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && !props.still) {
      parallax.value = event.clientX / window.innerWidth - 0.5
    }
  },
  { passive: true },
)
const layer = (depth: number) => ({
  transform: `translateX(${(-parallax.value * depth).toFixed(2)}px)`,
})

const shooting = useTemplateRef<HTMLSpanElement>('shooting')
let shootingTimer: ReturnType<typeof setTimeout> | undefined
function launchShootingStar(): void {
  const element = shooting.value
  if (element && !props.still) {
    element.style.left = `${(30 + Math.random() * 62).toFixed(1)}%`
    element.style.top = `${(4 + Math.random() * 28).toFixed(1)}%`
    element.animate(
      [
        { opacity: 0, translate: '0 0' },
        { opacity: 1, offset: 0.15 },
        { opacity: 0, translate: '-340px 110px' },
      ],
      { duration: 1300, easing: 'ease-out' },
    )
  }
  shootingTimer = setTimeout(launchShootingStar, 7000 + Math.random() * 9000)
}
onMounted(() => {
  shootingTimer = setTimeout(launchShootingStar, 2500)
})
onBeforeUnmount(() => {
  clearTimeout(shootingTimer)
})
</script>

<template>
  <div class="scene" :data-urgency="urgency" :class="{ still }" aria-hidden="true">
    <div class="sky" />
    <div class="sun" />
    <div class="moon" />
    <div class="stars">
      <i
        v-for="(star, index) in stars"
        :key="index"
        :style="{
          left: `${star.left}%`,
          top: `${star.top}%`,
          animationDuration: `${star.duration}s`,
          animationDelay: `${star.delay}s`,
          transform: `scale(${star.scale})`,
        }"
      />
    </div>
    <span ref="shooting" class="shooting" />
    <div class="cloud cloud-1" />
    <div class="cloud cloud-2" />
    <div class="cloud cloud-3" />
    <div class="urgency" />

    <svg class="panorama" viewBox="0 0 2400 420" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient
          id="scene-snow"
          x1="0"
          y1="90"
          x2="0"
          y2="270"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" class="snow" />
          <stop offset=".4" class="snow" />
          <stop offset=".8" class="ridge" />
        </linearGradient>
        <linearGradient
          id="scene-glow"
          x1="0"
          y1="90"
          x2="0"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" class="glow" />
          <stop offset="1" class="glow fade" />
        </linearGradient>
        <linearGradient id="scene-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" class="beam" />
          <stop offset="1" class="beam fade" />
        </linearGradient>
      </defs>

      <g :style="layer(6)">
        <path fill="url(#scene-snow)" :d="FAR_RIDGE" />
        <path class="alpenglow" :d="FAR_RIDGE" />
      </g>

      <g :style="layer(12)">
        <path class="mid" :d="MID_RIDGE" />
        <line class="distant-track" x1="0" y1="330" x2="2400" y2="330" />
        <g class="distant-train">
          <rect x="0" y="318" width="44" height="11" rx="3" />
          <rect x="47" y="318" width="44" height="11" rx="3" />
          <rect x="94" y="318" width="50" height="11" rx="4" />
          <rect class="lit" x="5" y="320" width="34" height="3" rx="1" />
          <rect class="lit" x="52" y="320" width="34" height="3" rx="1" />
          <rect class="lit" x="99" y="320" width="36" height="3" rx="1" />
        </g>
      </g>

      <g :style="layer(20)">
        <path class="near" :d="NEAR_RIDGE" />
        <rect class="ground" x="0" y="392" width="2400" height="28" />
        <path class="wire" d="M0 311 L2400 311" />
        <g v-for="mast in MASTS" :key="mast" class="mast">
          <line :x1="mast" y1="392" :x2="mast" y2="300" />
          <line :x1="mast" y1="306" :x2="mast + 30" y2="306" />
        </g>
        <rect class="platform" x="860" y="386" width="660" height="6" rx="3" />
        <line class="rail" x1="0" y1="393" x2="2400" y2="393" />
        <g v-if="stationName" class="sign" transform="translate(1272 296)">
          <line x1="14" y1="30" x2="14" y2="90" />
          <line x1="166" y1="30" x2="166" y2="90" />
          <rect width="180" height="30" rx="5" />
          <text x="90" y="21">{{ stationName }}</text>
        </g>
        <TrainSprite
          v-if="departureAt !== null"
          :transform="`translate(${offset.toFixed(1)} 0)`"
          :style="{ '--trail': trail.toFixed(2) }"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--color-scene-sky-1) 0%,
    var(--color-scene-sky-2) 38%,
    var(--color-scene-sky-3) 70%,
    var(--color-scene-sky-4) 100%
  );
}

.sun {
  position: absolute;
  left: 64%;
  top: 70%;
  width: 90vmax;
  height: 90vmax;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, var(--color-scene-sun) 0%, transparent 55%);
  animation: breathe 11s ease-in-out infinite;
}

.moon {
  position: absolute;
  left: 77%;
  top: 13%;
  width: clamp(26px, 3vmax, 60px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 38%,
    var(--color-scene-moon),
    color-mix(in srgb, var(--color-scene-moon) 72%, transparent) 72%
  );
  box-shadow: 0 0 60px 16px color-mix(in srgb, var(--color-scene-moon) 28%, transparent);
}

.stars i {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--color-scene-star);
  animation: twinkle 3s ease-in-out infinite;
}

.shooting {
  position: absolute;
  width: 150px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--color-scene-star), transparent);
  opacity: 0;
  transform: rotate(-18deg);
}

.cloud {
  position: absolute;
  left: 0;
  height: 9vmax;
  border-radius: 50%;
  background: var(--color-scene-cloud);
  filter: blur(32px);
  animation: drift linear infinite;
}

.cloud-1 {
  top: 10%;
  width: 42vmax;
  animation-duration: 230s;
  animation-delay: -70s;
}

.cloud-2 {
  top: 24%;
  width: 30vmax;
  animation-duration: 280s;
  animation-delay: -180s;
}

.cloud-3 {
  top: 3%;
  width: 26vmax;
  animation-duration: 200s;
  animation-delay: -120s;
}

.urgency {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s ease;
}

.scene[data-urgency='soon'] .urgency {
  opacity: 1;
  background: radial-gradient(
    130% 55% at 50% 100%,
    color-mix(in srgb, var(--color-soon) 40%, transparent),
    transparent 70%
  );
}

.scene[data-urgency='tight'] .urgency {
  opacity: 1;
  background: radial-gradient(
    130% 60% at 50% 100%,
    color-mix(in srgb, var(--color-late) 50%, transparent),
    transparent 70%
  );
  animation: breathe 1.6s ease-in-out infinite;
}

.panorama {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: clamp(190px, 38vh, 640px);
}

.snow {
  stop-color: var(--color-scene-snow);
}
.ridge {
  stop-color: var(--color-scene-ridge-far);
}
.glow {
  stop-color: var(--color-scene-glow);
}
.beam {
  stop-color: var(--color-scene-beam);
}
.fade {
  stop-opacity: 0;
}

.alpenglow {
  fill: url(#scene-glow);
  animation: breathe 8s ease-in-out infinite;
}
.mid {
  fill: var(--color-scene-ridge-mid);
}
.near {
  fill: var(--color-scene-ridge-near);
}
.ground {
  fill: var(--color-scene-ground);
}
.distant-track {
  stroke: var(--color-scene-wire);
  stroke-width: 1.5;
}
.distant-train {
  opacity: 0.8;
  animation: distant-ride 80s linear infinite;
}
.distant-train rect {
  fill: var(--color-train-body);
}
.distant-train .lit {
  fill: var(--color-train-window);
}
.wire,
.mast line {
  fill: none;
  stroke: var(--color-scene-wire);
  stroke-width: 2;
}
.platform {
  fill: var(--color-scene-platform);
}
.rail {
  stroke: var(--color-scene-rail);
  stroke-width: 3;
}
.sign rect {
  fill: var(--color-scene-sign);
}
.sign line {
  stroke: var(--color-scene-wire);
  stroke-width: 3;
}
.sign text {
  fill: #fff;
  font: 600 17px var(--font-sans);
  text-anchor: middle;
}

.still * {
  animation: none !important;
}

@keyframes breathe {
  50% {
    opacity: 0.55;
  }
}

@keyframes twinkle {
  50% {
    opacity: 0.15;
  }
}

@keyframes drift {
  from {
    transform: translateX(-50vmax);
  }
  to {
    transform: translateX(calc(100vw + 10vmax));
  }
}

@keyframes distant-ride {
  from {
    transform: translateX(2550px);
  }
  to {
    transform: translateX(-260px);
  }
}
</style>
