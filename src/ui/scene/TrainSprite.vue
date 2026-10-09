<script setup lang="ts">
// A two-car double-deck commuter train, drawn in the 2400 × 420 panorama coordinates with
// its rear at x = 0 and its wheels on the rail at y = 393.

interface Car {
  readonly start: number
  readonly length: number
  readonly front: boolean
}

const cars: readonly Car[] = [
  { start: 0, length: 222, front: false },
  { start: 230, length: 246, front: true },
]

const bodyPath = ({ start, length, front }: Car): string => {
  const end = start + length
  return front
    ? `M${start} 386 L${start} 350 Q${start} 338 ${start + 14} 338 L${end - 56} 338 Q${end - 24} 338 ${end - 8} 360 L${end} 378 Q${end + 2} 386 ${end - 8} 386 Z`
    : `M${start} 386 L${start} 350 Q${start} 338 ${start + 14} 338 L${end - 14} 338 Q${end} 338 ${end} 350 L${end} 386 Z`
}

const doorsOf = (car: Car): number[] => [car.start + 52, car.start + 148]

const windowsOf = (car: Car): { x: number; lower: boolean }[] => {
  const doors = doorsOf(car)
  const last = car.start + car.length - (car.front ? 64 : 30)
  const windows: { x: number; lower: boolean }[] = []
  for (let x = car.start + 12; x <= last; x += 22) {
    windows.push({ x, lower: !doors.some((door) => x + 16 > door - 2 && x < door + 20) })
  }
  return windows
}

const bogiesOf = (car: Car): number[] => [car.start + 22, car.start + car.length - 72]
</script>

<template>
  <g class="train">
    <path class="beam" d="M476 366 L820 330 L820 404 Z" />
    <g class="trail">
      <line x1="-14" y1="350" x2="-134" y2="350" />
      <line x1="-14" y1="362" x2="-194" y2="362" />
      <line x1="-14" y1="374" x2="-114" y2="374" />
    </g>
    <template v-for="car in cars" :key="car.start">
      <path class="body" :d="bodyPath(car)" />
      <rect
        class="shade"
        :x="car.start"
        y="376"
        :width="car.length - (car.front ? 9 : 0)"
        height="10"
      />
      <rect
        class="stripe"
        :x="car.start"
        y="371"
        :width="car.length - (car.front ? 5 : 0)"
        height="4"
      />
      <template v-for="door in doorsOf(car)" :key="door">
        <rect class="door" :x="door" y="351" width="18" height="35" rx="2" />
        <rect class="window" :x="door + 4" y="355" width="10" height="11" rx="2" />
      </template>
      <template v-for="pane in windowsOf(car)" :key="pane.x">
        <rect class="window" :x="pane.x" y="342" width="16" height="9" rx="3" />
        <rect v-if="pane.lower" class="window" :x="pane.x" y="357" width="16" height="9" rx="3" />
      </template>
      <rect class="shade" :x="car.start + 96" y="333" width="64" height="6" rx="3" />
      <template v-for="bogie in bogiesOf(car)" :key="bogie">
        <rect class="bogie" :x="bogie" y="384" width="46" height="6" rx="3" />
        <circle class="bogie" :cx="bogie + 11" cy="389" r="4.5" />
        <circle class="bogie" :cx="bogie + 35" cy="389" r="4.5" />
      </template>
    </template>
    <rect class="bogie" x="222" y="352" width="8" height="28" rx="2" />
    <path class="window" d="M440 342 Q456 345 465 360 L444 360 Z" />
    <circle class="lamp" cx="472" cy="380" r="2.6" />
    <path class="pantograph" d="M280 338 L296 322 L312 338 M296 322 L292 312 M278 312 L308 312" />
  </g>
</template>

<style scoped>
.body {
  fill: var(--color-train-body);
}
.shade {
  fill: var(--color-train-shade);
}
.door {
  fill: var(--color-train-door);
}
.window {
  fill: var(--color-train-window);
}
.stripe {
  fill: var(--color-train);
}
.bogie {
  fill: var(--color-train-bogie);
}
.lamp {
  fill: #fff6d6;
}
.beam {
  fill: url(#scene-beam);
}
.pantograph {
  fill: none;
  stroke: var(--color-train-bogie);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.trail {
  opacity: var(--trail, 0);
}
.trail line {
  stroke: var(--color-scene-rail);
  stroke-width: 3;
  stroke-linecap: round;
}
</style>
