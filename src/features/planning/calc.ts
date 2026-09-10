import { addDays, fromISODate, toISODate } from '../../lib/dates';
import type { Booking, DayHalf, Person, Project, ProjectStatus } from '../../types';

export function projectBookingsFor(bookings: Booking[], projectId: string): Booking[] {
  return bookings.filter((b) => b.projectId === projectId);
}

/** Which half(s) of a given day a booking covers — empty if the day is outside its range. */
export function coveredHalves(booking: Booking, dayIso: string): DayHalf[] {
  if (dayIso < booking.startDate || dayIso > booking.endDate) return [];
  const startHalf = booking.startHalf ?? 'AM';
  const endHalf = booking.endHalf ?? 'PM';
  const isStartDay = dayIso === booking.startDate;
  const isEndDay = dayIso === booking.endDate;

  if (isStartDay && isEndDay) {
    if (startHalf === 'AM' && endHalf === 'PM') return ['AM', 'PM'];
    if (startHalf === 'AM' && endHalf === 'AM') return ['AM'];
    if (startHalf === 'PM' && endHalf === 'PM') return ['PM'];
    return []; // PM -> AM would end before it starts; treat as nothing booked
  }
  if (isStartDay) return startHalf === 'PM' ? ['PM'] : ['AM', 'PM'];
  if (isEndDay) return endHalf === 'AM' ? ['AM'] : ['AM', 'PM'];
  return ['AM', 'PM'];
}

/** Fraction of a day (0, 0.5 or 1) a booking covers. */
function dayFraction(booking: Booking, dayIso: string): number {
  return coveredHalves(booking, dayIso).length * 0.5;
}

/** Sum of daily rates for a booking's date range, restricted to days matching the predicate. */
function sumDailyCost(booking: Booking, person: Person | undefined, dayFilter: (iso: string) => boolean): number {
  if (!person) return 0;
  const start = fromISODate(booking.startDate);
  const end = fromISODate(booking.endDate);
  let total = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const iso = toISODate(d);
    if (dayFilter(iso)) total += person.dailyRate * dayFraction(booking, iso);
  }
  return total;
}

export interface ProjectBudget {
  consumed: number;
  projected: number;
  status: ProjectStatus;
  ratio: number;
}

export function computeProjectBudget(
  project: Project,
  bookings: Booking[],
  people: Person[],
): ProjectBudget {
  const todayIso = toISODate(new Date());
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const relevant = projectBookingsFor(bookings, project.id);

  let consumed = 0;
  let projected = 0;
  for (const booking of relevant) {
    const person = peopleById.get(booking.personId);
    projected += sumDailyCost(booking, person, () => true);
    consumed += sumDailyCost(booking, person, (iso) => iso <= todayIso);
  }

  const ratio = project.budget > 0 ? projected / project.budget : 0;
  const status: ProjectStatus = ratio > 1 ? 'depassement' : ratio > 0.85 ? 'tendu' : 'sous_controle';

  return { consumed, projected, status, ratio };
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  sous_controle: 'Sous contrôle',
  tendu: 'Tendu',
  depassement: 'Dépassement',
};

/**
 * Days (ISO) where a person has more than one *project* booking overlapping
 * the same half of the day — a double-booking conflict. A morning booking on
 * one project and an afternoon booking on another is not a conflict.
 */
export function computeConflictDays(bookings: Booking[]): Map<string, Set<string>> {
  const conflictsByPerson = new Map<string, Set<string>>();
  const countByPersonDayHalf = new Map<string, number>();

  for (const booking of bookings) {
    if (!booking.projectId) continue;
    const start = fromISODate(booking.startDate);
    const end = fromISODate(booking.endDate);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const iso = toISODate(d);
      for (const half of coveredHalves(booking, iso)) {
        const key = `${booking.personId}__${iso}__${half}`;
        countByPersonDayHalf.set(key, (countByPersonDayHalf.get(key) ?? 0) + 1);
      }
    }
  }

  for (const [key, count] of countByPersonDayHalf) {
    if (count > 1) {
      const [personId, iso] = key.split('__');
      if (!conflictsByPerson.has(personId)) conflictsByPerson.set(personId, new Set());
      conflictsByPerson.get(personId)!.add(iso);
    }
  }

  return conflictsByPerson;
}

/** The project bookings of a person that touch at least one of their conflict days. */
export function conflictingBookingsForPerson(personId: string, bookings: Booking[], conflictDays: Set<string>): Booking[] {
  return bookings.filter((b) => {
    if (b.personId !== personId || !b.projectId) return false;
    const start = fromISODate(b.startDate);
    const end = fromISODate(b.endDate);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (conflictDays.has(toISODate(d))) return true;
    }
    return false;
  });
}

export function totalPersonDaysReserved(bookings: Booking[]): number {
  let total = 0;
  for (const booking of bookings) {
    const start = fromISODate(booking.startDate);
    const end = fromISODate(booking.endDate);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      total += dayFraction(booking, toISODate(d));
    }
  }
  return total;
}
