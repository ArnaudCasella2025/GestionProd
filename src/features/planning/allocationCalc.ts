import { isWeekend, toISODate } from '../../lib/dates';
import { HOURS_PER_DAY, type Booking, type TimesheetDay } from '../../types';
import { coveredHalves } from './calc';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Days booked (Plan de charge) on a project within one calendar month, for
 * bookings already filtered to one person and one project. Weekends don't
 * count as bookable capacity, even when a booking's date range spans one. */
export function bookedDaysInMonth(personProjectBookings: Booking[], year: number, month: number): number {
  if (personProjectBookings.length === 0) return 0;
  const total = daysInMonth(year, month);
  let sum = 0;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month - 1, day);
    if (isWeekend(date)) continue;
    const iso = toISODate(date);
    for (const booking of personProjectBookings) sum += coveredHalves(booking, iso).length * 0.5;
  }
  return sum;
}

/**
 * The "Réel" figure for one person/project/month: days actually declared on the
 * timesheet for days up to and including today, and days booked (Plan de
 * charge) for the remaining, still-future days of the month.
 */
export function realDaysInMonth(
  personProjectBookings: Booking[],
  personTimesheets: TimesheetDay[],
  projectId: string,
  year: number,
  month: number,
  todayIso: string,
): number {
  const total = daysInMonth(year, month);
  const timesheetByDate = new Map(personTimesheets.map((t) => [t.date, t]));
  let sum = 0;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month - 1, day);
    if (isWeekend(date)) continue;
    const iso = toISODate(date);
    if (iso <= todayIso) {
      const declared = timesheetByDate.get(iso);
      if (declared) sum += declared.hours.filter((h) => h?.projectId === projectId).length / HOURS_PER_DAY;
    } else {
      for (const booking of personProjectBookings) sum += coveredHalves(booking, iso).length * 0.5;
    }
  }
  return sum;
}
