import { addDays, fromISODate, isWeekend, toISODate } from '../../lib/dates';
import type { Booking, Person } from '../../types';
import { isPersonCustomOffDay } from './calc';

export interface ScheduledRun {
  startDate: string;
  endDate: string;
}

export interface DistributeResult {
  /** One run per Booking to create — a run only ever spans more than one day
   * when everything strictly between its two dates is a weekend or one of
   * the person's own configured off-days, never a real candidate day the
   * distribution deliberately skipped (that must stay its own booking, or
   * the skipped day would silently read as booked too). */
  runs: ScheduledRun[];
  /** How many of the requested days were actually placed — can fall short
   * of requestedCount if the range simply doesn't have that much capacity. */
  scheduledCount: number;
  requestedCount: number;
}

function isWorkableDay(person: Person, date: Date): boolean {
  return !isWeekend(date) && !isPersonCustomOffDay(person, date);
}

/** Picks `count` items from a sorted list, spread as evenly as possible
 * across it, rather than just taking the first `count`. */
function pickEvenly(items: string[], count: number): string[] {
  if (count >= items.length) return items;
  if (count <= 0) return [];
  const stride = items.length / count;
  const seen = new Set<number>();
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    let idx = Math.min(items.length - 1, Math.floor(i * stride + stride / 2));
    while (seen.has(idx) && idx < items.length - 1) idx++;
    seen.add(idx);
    picked.push(items[idx]);
  }
  return picked.sort();
}

/** Whether a new run can be extended from lastIso through to nextIso — only
 * when every calendar day strictly between them is a weekend or one of the
 * person's own off-days (never a real workday that was simply not picked). */
function canExtend(person: Person, lastIso: string, nextIso: string): boolean {
  let d = addDays(fromISODate(lastIso), 1);
  const next = fromISODate(nextIso);
  while (d < next) {
    if (isWorkableDay(person, d)) return false;
    d = addDays(d, 1);
  }
  return true;
}

/**
 * Spreads `targetDays` bookable days for `person` across [rangeStart,
 * rangeEnd] on a given project, preferring days with no existing booking of
 * any kind (another project, an absence); only once every such day in the
 * range is used does it start doubling up on already-booked days, still
 * spread as evenly as possible rather than piling onto the first ones.
 */
export function distributeDays(
  person: Person,
  rangeStart: string,
  rangeEnd: string,
  targetDays: number,
  existingBookingsForPerson: Booking[],
): DistributeResult {
  if (targetDays <= 0) return { runs: [], scheduledCount: 0, requestedCount: targetDays };

  const bookedDays = new Set<string>();
  for (const b of existingBookingsForPerson) {
    let d = fromISODate(b.startDate);
    const end = fromISODate(b.endDate);
    while (d <= end) {
      bookedDays.add(toISODate(d));
      d = addDays(d, 1);
    }
  }

  const free: string[] = [];
  const busy: string[] = [];
  let d = fromISODate(rangeStart);
  const end = fromISODate(rangeEnd);
  while (d <= end) {
    if (isWorkableDay(person, d)) {
      const iso = toISODate(d);
      (bookedDays.has(iso) ? busy : free).push(iso);
    }
    d = addDays(d, 1);
  }

  const selected = targetDays <= free.length ? pickEvenly(free, targetDays) : [...free, ...pickEvenly(busy, targetDays - free.length)];
  selected.sort();

  const runs: ScheduledRun[] = [];
  for (const iso of selected) {
    const last = runs[runs.length - 1];
    if (last && canExtend(person, last.endDate, iso)) {
      last.endDate = iso;
    } else {
      runs.push({ startDate: iso, endDate: iso });
    }
  }

  return { runs, scheduledCount: selected.length, requestedCount: targetDays };
}
