export type AbsenceType = 'conge' | 'rtt' | 'teletravail' | 'maladie';

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  conge: 'Congé',
  rtt: 'RTT',
  teletravail: 'Télétravail',
  maladie: 'Maladie',
};

/** Absence types a user can submit through "Mes absences" for director approval.
 * Télétravail is excluded — it's purely declarative, booked directly with no
 * approval step. */
export const REQUESTABLE_ABSENCE_TYPES: AbsenceType[] = ['conge', 'rtt', 'maladie'];

/** Default yearly quotas (in workdays), used when a person has no override set. */
export const DEFAULT_CONGES_PER_YEAR = 25;
export const DEFAULT_RTT_PER_YEAR = 11;

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

/** One entry in a person's salary history, effective from startDate until the
 * next entry (or forever, if it's the most recent one). */
export interface SalaryRecord {
  /** ISO date (YYYY-MM-DD) this salary takes effect from, inclusive. */
  startDate: string;
  /** Monthly gross salary, in euros. */
  grossMonthlySalary: number;
  /** Employer social-charges rate, as a percentage (e.g. 40 for 40%). */
  chargesPercent: number;
}

/** Conventional working days per month used to derive a daily rate from a
 * monthly salary — a business-policy constant; adjust here if the studio's
 * own convention differs. */
export const WORKING_DAYS_PER_MONTH = 21;

export interface Person {
  id: string;
  name: string;
  role: string;
  /** The rate used everywhere costs are computed. Manually set, unless
   * salaryHistory is non-empty, in which case it's kept in sync with the
   * record effective today (see salaryCalc.ts). */
  dailyRate: number;
  /** Access level for future role-based auth — see the Équipe screen's own notice. Defaults to 'user'. */
  accessLevel?: AccessLevel;
  /** Yearly congés payés quota, in workdays. Defaults to DEFAULT_CONGES_PER_YEAR if unset. */
  congesPerYear?: number;
  /** Yearly RTT quota, in workdays. Defaults to DEFAULT_RTT_PER_YEAR if unset. */
  rttPerYear?: number;
  /** Salary changes over time. Empty/unset means dailyRate is a plain manual value. */
  salaryHistory?: SalaryRecord[];
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
  /** Free-text annotation per booked day (ISO date -> note), e.g. to say what a
   * multi-day booking is actually spent on, day by day. */
  dayNotes?: Record<string, string>;
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

/** A single non-working calendar day (e.g. "14 juillet"), entered by an admin. */
export interface PublicHoliday {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  label: string;
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

/**
 * A manual override of the "Officiel" planned allocation for one person, on one
 * project, for one calendar month. Stored in days (jours-homme) — the € figure
 * shown in "Affectation des permanents" is always days × the person's dailyRate.
 * Absent means "use the value calculated from Plan de charge bookings instead".
 */
export interface AllocationOverride {
  id: string;
  personId: string;
  projectId: string;
  year: number;
  /** 1-12 */
  month: number;
  days: number;
}
