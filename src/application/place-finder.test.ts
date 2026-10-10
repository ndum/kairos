import { describe, expect, it, vi } from 'vitest'

import type { StopRef } from '@/domain/route'
import { minutes } from '@/domain/time'

import { PlaceFinder } from './place-finder'
import type { FoundPlace, PlaceSearchPort } from './ports/place-search'

const address = (name: string): FoundPlace => ({
  name,
  kind: 'address',
  coordinates: { latitude: 47.4861, longitude: 7.7307 },
})

const company = (name: string): FoundPlace => ({
  name,
  kind: 'poi',
  coordinates: { latitude: 47.5545, longitude: 7.5948 },
})

const source = (places: FoundPlace[] | Error) => ({
  searchPlaces: vi.fn<PlaceSearchPort['searchPlaces']>(() =>
    places instanceof Error ? Promise.reject(places) : Promise.resolve(places),
  ),
})

const stopAt = (name: string, latitude: number, longitude: number): StopRef => ({
  id: name,
  name,
  coordinates: { latitude, longitude },
})

function setup({ addresses = source([]), companies = source([]), stops = [] as StopRef[] } = {}) {
  const stopsNear = vi.fn(() => Promise.resolve(stops))
  const finder = new PlaceFinder({ addresses, companies, timetable: { stopsNear } })
  return { finder, addresses, companies, stopsNear }
}

describe('PlaceFinder.find', () => {
  it('waits for at least three characters', async () => {
    const { finder, addresses } = setup()

    expect(await finder.find(' ab ')).toEqual([])
    expect(addresses.searchPlaces).not.toHaveBeenCalled()
  })

  it('puts companies first unless the text holds a house number', async () => {
    const { finder } = setup({
      addresses: source([address('Messeplatz 1, 4058 Basel')]),
      companies: source([company('Messe Basel')]),
    })

    expect((await finder.find('Messe')).map(({ name }) => name)).toEqual([
      'Messe Basel',
      'Messeplatz 1, 4058 Basel',
    ])
    expect((await finder.find('Messeplatz 1')).map(({ name }) => name)).toEqual([
      'Messeplatz 1, 4058 Basel',
      'Messe Basel',
    ])
  })

  it('lists every name once and at most five per source', async () => {
    const parkings = Array.from({ length: 4 }, () => company('Parking Kunstmuseum, Basel'))
    const museums = ['Neubau', 'Hauptbau', 'Gegenwart', 'Bibliothek', 'Shop', 'Café'].map((part) =>
      company(`Kunstmuseum Basel | ${part}`),
    )
    const { finder } = setup({ companies: source([...parkings, ...museums]) })

    const names = (await finder.find('Kunstmuseum')).map(({ name }) => name)

    expect(names).toEqual([
      'Parking Kunstmuseum, Basel',
      'Kunstmuseum Basel | Neubau',
      'Kunstmuseum Basel | Hauptbau',
      'Kunstmuseum Basel | Gegenwart',
      'Kunstmuseum Basel | Bibliothek',
    ])
  })

  it('shows what one source found when the other fails', async () => {
    const { finder } = setup({
      addresses: source(new Error('Offline')),
      companies: source([company('Messe Basel')]),
    })

    expect(await finder.find('Messe')).toEqual([company('Messe Basel')])
  })

  it('fails when both sources fail', async () => {
    const { finder } = setup({
      addresses: source(new Error('Offline')),
      companies: source(new Error('Offline')),
    })

    await expect(finder.find('Messe')).rejects.toThrow()
  })
})

describe('PlaceFinder.stopsNear', () => {
  const home = { latitude: 47.48607, longitude: 7.73068 }

  it('sends only a rounded position', async () => {
    const { finder, stopsNear } = setup()

    await finder.stopsNear(home)

    expect(stopsNear).toHaveBeenCalledWith({ latitude: 47.486, longitude: 7.731 }, undefined)
  })

  it('offers the closest stops with the walk to each', async () => {
    const { finder } = setup({
      stops: [
        stopAt('Liestal', 47.48446, 7.73137),
        stopAt('Liestal, Kantonsspital', 47.48717, 7.73052),
        { id: '8500999', name: 'Without position' },
      ],
    })

    const nearby = await finder.stopsNear(home)

    expect(nearby.map(({ stop }) => stop.name)).toEqual(['Liestal, Kantonsspital', 'Liestal'])
    expect(nearby.map(({ distance }) => Math.round(distance))).toEqual([123, 186])
    expect(nearby.map(({ walk }) => walk)).toEqual([minutes(2), minutes(4)])
  })
})
