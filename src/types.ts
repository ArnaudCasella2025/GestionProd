export type AbsenceType = 'conge' | 'teletravail' | 'maladie';

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  conge: 'Congé',
  teletravail: 'Télétravail',
  maladie: 'Maladie',
};

export type AccessLevel = 'admin' | 'responsable' | 'user';

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  admin: 'Admin',
  responsable: 'Responsable',
  user: 'User',
};

/** Fixed list of job titles offered in the Équipe screen's "poste" dropdown. */
export const JOB_TITLES = [
  'Directeur·rice de production',
  'Directeur·rice produit',
  'Directeur·rice financier·ère',
  'Chargé·e de production',
  'Assistant·e de production',
  'Chef·fe de projet',
  'Réalisateur·rice',
  'Game designer',
  'Character artist',
  'Développeur·se gameplay',
  'Monteur·se',
  'Sound designer',
] as const;

export interface Person {
  id: string;
  name: string;
  role: string;
  dailyRate: number;
  /** Access level for future role-based auth — see the Équipe screen's own notice. Defaults to 'user'. */
  accessLevel?: AccessLevel;
}

export type ProjectStatus = 'sous_controle' | 'tendu' | 'depassement';

export interface Project {
  id: string;
  name: string;
  /** Name of the funder/client. */
  client: string;
  color: string;
  budget: number;
  description?: string;
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

/** A day needs this many declared hours (anywhere in TIMESHEET_HOURS) to count as complete. */
export const HOURS_PER_DAY = 7;

/** Clock-hour window that counts as regular time; slots outside it are overtime. */
export const OFFICE_START_HOUR = 9;
export const OFFICE_END_HOUR = 19;

/** Full range of hourly slots offered on the timesheet grid — wider than office
 * hours on both ends so early starts and evening overtime can be declared. */
export const TIMESHEET_START_HOUR = 7;
export const TIMESHEET_END_HOUR = 22;
export const TIMESHEET_HOURS = Array.from(
  { length: TIMESHEET_END_HOUR - TIMESHEET_START_HOUR },
  (_, i) => TIMESHEET_START_HOUR + i,
);

/** What one declared hour was spent on — a project, or an absence type. */
export interface TimesheetHourSlot {
  projectId?: string;
  absenceType?: AbsenceType;
}

/** One person's timesheet for one day: one slot per hour in TIMESHEET_HOURS, null where undeclared. */
export interface TimesheetDay {
  id: string;
  personId: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  hours: (TimesheetHourSlot | null)[];
}
