export type AbsenceType = 'conge' | 'teletravail' | 'maladie';

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  conge: 'Congé',
  teletravail: 'Télétravail',
  maladie: 'Maladie',
};

export interface Person {
  id: string;
  name: string;
  role: string;
  dailyRate: number;
}

export type ProjectStatus = 'sous_controle' | 'tendu' | 'depassement';

export interface Project {
  id: string;
  name: string;
  client: string;
  color: string;
  budget: number;
}

export type DayHalf = 'AM' | 'PM';

export interface Booking {
  id: string;
  personId: string;
  /** Set when this booking is a project assignment. */
  projectId?: string;
  /** Set when this booking is an absence instead of a project assignment. */
  absenceType?: AbsenceType;
  /** ISO date (YYYY-MM-DD), inclusive. */
  startDate: string;
  /** ISO date (YYYY-MM-DD), inclusive. */
  endDate: string;
  /** Which half of startDate the booking begins on. Defaults to 'AM' (start of day). */
  startHalf?: DayHalf;
  /** Which half of endDate the booking ends on. Defaults to 'PM' (end of day). */
  endHalf?: DayHalf;
}

export type RequestStatus = 'pending' | 'approved' | 'refused';

export interface AbsenceRequest {
  id: string;
  personId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  status: RequestStatus;
}

export type ZoomLevel = 'semaine' | 'mois' | 'annee';
