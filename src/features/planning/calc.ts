import { addDays, fromISODate, toISODate } from '../../lib/dates';
import type { Booking, Person, Project, ProjectStatus } from '../../types';

export function projectBookingsFor(bookings: Booking[], projectId: string): Booking[] {
  return bookings.filter((b) => b.projectId === projectId);
}

/** Sum of daily rates for a booking's date range, restricted to days matching the predicate. */
function sumDailyCost(booking: Booking, person: Person | undefined, dayFilter: (iso: string) => boolean): number {
  if (!person) return 0;
  const start = fromISODate(booking.startDate);
  const end = fromISODate(booking.endDate);
  let total = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const iso = toISODate(d);
    if (dayFilter(iso)) total += person.dailyRate;
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

/** Days (ISO) where a person has more than one *project* booking — a double-booking conflict. */
export function computeConflictDays(bookings: Booking[]): Map<string, Set<string>> {
  const conflictsByPerson = new Map<string, Set<string>>();
  const countByPersonDay = new Map<string, number>();

  for (const booking of bookings) {
    if (!booking.projectId) continue;
    const start = fromISODate(booking.startDate);
    const end = fromISODate(booking.endDate);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const key = `${booking.personId}__${toISODate(d)}`;
      countByPersonDay.set(key, (countByPersonDay.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of countByPersonDay) {
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
    total += Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }
  return total;
}
