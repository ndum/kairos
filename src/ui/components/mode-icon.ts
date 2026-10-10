import type { Component } from 'vue'
import IconBus from '~icons/tabler/bus'
import IconPoint from '~icons/tabler/point'
import IconShip from '~icons/tabler/ship'
import IconTrain from '~icons/tabler/train'

import type { TransportMode } from '@/domain/journey'

const ICONS: Partial<Record<TransportMode, Component>> = {
  train: IconTrain,
  tram: IconTrain,
  bus: IconBus,
  ship: IconShip,
}

export const modeIcon = (mode: TransportMode): Component => ICONS[mode] ?? IconPoint
