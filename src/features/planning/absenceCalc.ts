import { addDays, fromISODate, isWeekend, startOfWeek, toISODate } from '../../lib/dates';
import { DEFAULT_CONGES_PER_YEAR, DEFAULT_RTT_PER_YEAR, type AbsenceRequest, type Booking, type Person } from '../../types';

/** Workdays (Mon-Fri) covered by an inclusive date range — weekends never
 * consume leave. */
export function requestWorkdayCount(startIso: string, endIso: string): number {
  let count = 0;
  let day = fromISODate(startIso);
  const end = fromISODate(endIso);
  while (day <= end) {
    if (!isWeekend(day)) count++;
    day = addDays(day, 1);
  }
  return count;
}

export interface LeaveBalance {
  quota: number;
  used: number;
  pending: number;
  remaining: number;
}

/** A person's congés or RTT balance for one calendar year: quota minus
 * approved and pending requests of that type starting in that year. */
export function leaveBalance(
  person: Person,
  requests: AbsenceRequest[],
  type: 'conge' | 'rtt',
  year: number,
): LeaveBalance {
  const quota = type === 'conge' ? (person.congesPerYear ?? DEFAULT_CONGES_PER_YEAR) : (person.rttPerYear ?? DEFAULT_RTT_PER_YEAR);
  const relevant = requests.filter(
    (r) => r.personId === person.id && r.type === type && r.startDate.slice(0, 4) === String(year) && r.status !== 'refused',
  );
  const used = relevant
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + requestWorkdayCount(r.startDate, r.endDate), 0);
  const pending = relevant
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + requestWorkdayCount(r.startDate, r.endDate), 0);
  return { quota, used, pending, remaining: quota - used - pending };
}

/** Work-day count of a person's already-booked télétravail days whose range
 * overlaps [weekStart, weekEnd] (a Monday..Sunday range). */
function teletravailDaysInWeek(bookings: Booking[], personId: string, weekStart: string, weekEnd: string): number {
  let total = 0;
  for (const b of bookings) {
    if (b.personId !== personId || b.absenceType !== 'teletravail') continue;
    const overlapStart = b.startDate > weekStart ? b.startDate : weekStart;
    const overlapEnd = b.endDate < weekEnd ? b.endDate : weekEnd;
    if (overlapStart > overlapEnd) continue;
    total += requestWorkdayCount(overlapStart, overlapEnd);
  }
  return total;
}

/** True if declaring télétravail over [startDate, endDate] would push any
 * single Monday..Sunday week (existing bookings + the new days falling in
 * that week) over the person's weekly quota — in which case the declaration
 * needs the manager's validation instead of being booked immediately. */
export function teletravailExceedsQuota(
  bookings: Booking[],
  personId: string,
  startDate: string,
  endDate: string,
  quotaPerWeek: number,
): boolean {
  const end = fromISODate(endDate);
  const seenWeeks = new Set<string>();
  for (let day = fromISODate(startDate); day <= end; day = addDays(day, 1)) {
    const weekStartDate = startOfWeek(day);
    const weekStart = toISODate(weekStartDate);
    if (seenWeeks.has(weekStart)) continue;
    seenWeeks.add(weekStart);
    const weekEnd = toISODate(addDays(weekStartDate, 6));
    const existing = teletravailDaysInWeek(bookings, personId, weekStart, weekEnd);
    const newRangeStart = startDate > weekStart ? startDate : weekStart;
    const newRangeEnd = endDate < weekEnd ? endDate : weekEnd;
    const newDays = requestWorkdayCount(newRangeStart, newRangeEnd);
    if (existing + newDays > quotaPerWeek) return true;
  }
  return false;
}
