import { toLocal } from './local-time'
import { HOUR, type Instant } from './time'

/** The timetable day ends at 4.00, so a trip after midnight still belongs to the evening. */
export const SERVICE_DAY_START = 4 * HOUR

/** The timetable day of an instant, as the Swiss date it started on. */
export const serviceDayOf = (instant: Instant): string => toLocal(instant - SERVICE_DAY_START).date
