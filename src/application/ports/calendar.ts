import type { Instant } from '@/domain/time'

/** An appointment for a calendar app, such as a trip from leaving one place to arriving. */
export interface CalendarEvent {
  /** Stays the same for the same trip, so adding it again updates the appointment. */
  readonly id: string
  readonly title: string
  readonly description: string
  /** Where the appointment starts, for example the first stop. */
  readonly location?: string
  readonly start: Instant
  readonly end: Instant
  /** Text of a reminder at the start of the appointment. */
  readonly reminder?: string
}

/** A file to hand over to the device, which opens it with a calendar app. */
export interface CalendarFile {
  readonly name: string
  readonly type: string
  readonly content: string
}

/** Writes appointments as files that calendar apps can add. */
export interface CalendarWriter {
  write(event: CalendarEvent): CalendarFile
}
