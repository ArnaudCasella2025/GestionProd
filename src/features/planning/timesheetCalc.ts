import { addDays, isWeekend, toISODate } from '../../lib/dates';
import { HOURS_PER_DAY, type TimesheetDay } from '../../types';

export function declaredHoursCount(day: TimesheetDay | undefined): number {
  if (!day) return 0;
  return day.hours.filter((h) => h != null).length;
}

export interface MissingDay {
  date: string;
  missing: number;
}

/**
 * Past weekdays (strictly before today, within `lookbackDays`) where a
 * person declared fewer than HOURS_PER_DAY hours — oldest first.
 */
export function missingDaysForPerson(personId: string, timesheets: TimesheetDay[], lookbackDays: number): MissingDay[] {
  const byDate = new Map(timesheets.filter((t) => t.personId === personId).map((t) => [t.date, t]));
  const today = new Date();
  const result: MissingDay[] = [];

  for (let i = 1; i <= lookbackDays; i++) {
    const day = addDays(today, -i);
    if (isWeekend(day)) continue;
    const iso = toISODate(day);
    const missing = HOURS_PER_DAY - declaredHoursCount(byDate.get(iso));
    if (missing > 0) result.push({ date: iso, missing });
  }

  return result.reverse();
}

export function totalMissingHours(missingDays: MissingDay[]): number {
  return missingDays.reduce((sum, d) => sum + d.missing, 0);
}
