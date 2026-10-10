import { useI18n } from 'vue-i18n'

import type { CalendarEvent } from '@/application/ports/calendar'
import { type RideLeg, delayOf, ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import { MINUTE } from '@/domain/time'
import type { Trip } from '@/domain/trip'

import { useFormat } from '../composables/use-format'
import { useServices } from '../services'
import { useToastStore } from '../stores/toasts'

/**
 * Passes a trip on: as text through the share menu of the device, or to the clipboard where
 * there is none, and as an appointment for the calendar with a reminder at the leave time.
 */
export function useTripSharing() {
  const { t } = useI18n()
  const format = useFormat()
  const { calendar } = useServices()
  const toasts = useToastStore()

  const titleOf = (ends: Endpoints) => `${ends.origin.name} → ${ends.destination.name}`

  /** One line per ride, for example: 07:05 IR 37 ab Liestal, Gleis 4, Richtung Basel SBB. */
  function rideLine(ride: RideLeg): string {
    const { departure, line } = ride
    const delay = format.minutes(delayOf(departure))
    const time =
      delay > 0
        ? `${format.time(departure.scheduledAt)} (${t('now.delayShort', { minutes: delay })})`
        : format.time(departure.scheduledAt)
    const platform = departure.expectedPlatform ?? departure.platform
    return [
      t('plan.share.ride', {
        time,
        line: t(`plan.share.line.${line.mode}`, { name: line.name }),
        stop: departure.stop.name,
      }),
      platform && t(`now.platform.${line.mode === 'train' ? 'track' : 'bay'}`, { platform }),
      line.headsign && t('plan.share.towards', { headsign: line.headsign }),
    ]
      .filter(Boolean)
      .join(', ')
  }

  function stepsOf(trip: Trip, ends: Endpoints): string[] {
    return [
      ...ridesOf(trip.journey).map(rideLine),
      t('plan.share.arrival', {
        place: ends.destination.name,
        time: format.time(trip.arrivalAt),
      }),
    ]
  }

  async function share(trip: Trip, ends: Endpoints): Promise<void> {
    const title = titleOf(ends)
    const text = [
      title,
      t('plan.share.leave', { time: format.time(trip.leaveAt) }),
      ...stepsOf(trip, ends),
    ].join('\n')
    if ('share' in navigator) {
      try {
        await navigator.share({ title, text })
        return
      } catch (error) {
        // Closing the share menu is no failure. Anything else falls back to the clipboard.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toasts.show(t('plan.share.copied'))
    } catch {
      toasts.show(t('plan.share.failed'))
    }
  }

  function addToCalendar(trip: Trip, ends: Endpoints): void {
    const [first] = ridesOf(trip.journey)
    const event: CalendarEvent = {
      id: `${first?.departure.stop.id ?? ''}-${trip.departureAt}@kairos`,
      title: titleOf(ends),
      description: stepsOf(trip, ends).join('\n'),
      ...(first && { location: first.departure.stop.name }),
      start: trip.leaveAt,
      end: trip.arrivalAt,
      reminder: t('plan.share.reminder', { place: ends.destination.name }),
    }
    const file = calendar.write(event)
    const url = URL.createObjectURL(new Blob([file.content], { type: file.type }))
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    // The download starts after the click returns, so the address has to live a little longer.
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, MINUTE)
  }

  return { share, addToCalendar }
}
