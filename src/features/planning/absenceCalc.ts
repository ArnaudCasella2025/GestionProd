import { addDays, fromISODate, isWeekend } from '../../lib/dates';
import { DEFAULT_CONGES_PER_YEAR, DEFAULT_RTT_PER_YEAR, type AbsenceRequest, type Person } from '../../types';

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
