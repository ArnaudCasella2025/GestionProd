import { isWeekend, toISODate } from '../../lib/dates';
import { DEFAULT_WORK_DAYS_PER_WEEK, HOURS_PER_DAY, type Booking, type Person, type SalaryRecord, type TimesheetDay } from '../../types';
import { coveredHalves, isPersonCustomOffDay } from './calc';
import { dailyRateOn } from './salaryCalc';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** How many days this person is contractually expected to work in a given
 * calendar month — weekdays in the month, scaled by their work-days-per-week
 * ratio (e.g. 4/5 for a 4/5e), rounded to the nearest half-day. The target
 * Affectation des permanents compares actual bookings against, to flag
 * under/over-staffing. */
export function expectedWorkDays(year: number, month: number, person: Person | undefined): number {
  const total = daysInMonth(year, month);
  let weekdayCount = 0;
  for (let day = 1; day <= total; day++) {
    if (!isWeekend(new Date(year, month - 1, day))) weekdayCount++;
  }
  const ratio = (person?.workDaysPerWeek ?? DEFAULT_WORK_DAYS_PER_WEEK) / 5;
  return Math.round(weekdayCount * ratio * 2) / 2;
}

/** Days booked (Plan de charge) on a project within one calendar month, for
 * bookings already filtered to one person and one project. Weekends, and
 * this person's own configured non-working weekdays, don't count as
 * bookable capacity, even when a booking's date range spans one. */
export function bookedDaysInMonth(personProjectBookings: Booking[], year: number, month: number, person?: Person): number {
  if (personProjectBookings.length === 0) return 0;
  const total = daysInMonth(year, month);
  let sum = 0;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month - 1, day);
    if (isWeekend(date) || isPersonCustomOffDay(person, date)) continue;
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
  person?: Person,
): number {
  const total = daysInMonth(year, month);
  const timesheetByDate = new Map(personTimesheets.map((t) => [t.date, t]));
  let sum = 0;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month - 1, day);
    if (isWeekend(date) || isPersonCustomOffDay(person, date)) continue;
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

/** Same as bookedDaysInMonth, but in euros — using the salary in effect on
 * each individual day rather than a single flat rate for the whole month. */
export function bookedCostInMonth(
  personProjectBookings: Booking[],
  year: number,
  month: number,
  salaryHistory: SalaryRecord[] | undefined,
  fallbackRate: number,
  person?: Person,
): number {
  if (personProjectBookings.length === 0) return 0;
  const total = daysInMonth(year, month);
  let sum = 0;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month - 1, day);
    if (isWeekend(date) || isPersonCustomOffDay(person, date)) continue;
    const iso = toISODate(date);
    const rate = dailyRateOn(salaryHistory, iso, fallbackRate, person?.socialChargesByMonth);
    for (const booking of personProjectBookings) sum += coveredHalves(booking, iso).length * 0.5 * rate;
  }
  return sum;
}

/** Same as realDaysInMonth, but in euros — using the salary in effect on each
 * individual day rather than a single flat rate for the whole month. */
export function realCostInMonth(
  personProjectBookings: Booking[],
  personTimesheets: TimesheetDay[],
  projectId: string,
  year: number,
  month: number,
  todayIso: string,
  salaryHistory: SalaryRecord[] | undefined,
  fallbackRate: number,
  person?: Person,
): number {
  const total = daysInMonth(year, month);
  const timesheetByDate = new Map(personTimesheets.map((t) => [t.date, t]));
  let sum = 0;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, month - 1, day);
    if (isWeekend(date) || isPersonCustomOffDay(person, date)) continue;
    const iso = toISODate(date);
    const rate = dailyRateOn(salaryHistory, iso, fallbackRate, person?.socialChargesByMonth);
    if (iso <= todayIso) {
      const declared = timesheetByDate.get(iso);
      if (declared) sum += (declared.hours.filter((h) => h?.projectId === projectId).length / HOURS_PER_DAY) * rate;
    } else {
      for (const booking of personProjectBookings) sum += coveredHalves(booking, iso).length * 0.5 * rate;
    }
  }
  return sum;
}
