import { WORKING_DAYS_PER_MONTH, type SalaryRecord } from '../../types';

export function chargeAmount(grossMonthlySalary: number, chargesPercent: number): number {
  return Math.round(grossMonthlySalary * (chargesPercent / 100));
}

export function loadedMonthlyCost(grossMonthlySalary: number, chargesPercent: number): number {
  return grossMonthlySalary + chargeAmount(grossMonthlySalary, chargesPercent);
}

/** The daily rate (TJM) implied by a monthly salary, loaded with social charges. */
export function dailyRateFor(grossMonthlySalary: number, chargesPercent: number): number {
  return Math.round((loadedMonthlyCost(grossMonthlySalary, chargesPercent) / WORKING_DAYS_PER_MONTH) * 100) / 100;
}

/** The salary record in effect on a given date — the latest one whose
 * startDate is on or before it. Null if the history is empty or every
 * record starts after that date. */
export function recordEffectiveOn(history: SalaryRecord[], dateIso: string): SalaryRecord | null {
  const applicable = history.filter((r) => r.startDate <= dateIso).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return applicable[0] ?? null;
}

export function socialChargesMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** The social-charges % in effect on a given date: the exact calendar month
 * if set in chargesByMonth, otherwise the closest earlier month that has
 * one, otherwise the legacy chargesPercent of the salary record effective
 * on that date (for people not yet migrated to the monthly table), else 0. */
export function socialChargesPercentOn(
  chargesByMonth: Record<string, number> | undefined,
  history: SalaryRecord[] | undefined,
  dateIso: string,
): number {
  const targetKey = dateIso.slice(0, 7);
  if (chargesByMonth) {
    if (chargesByMonth[targetKey] != null) return chargesByMonth[targetKey];
    const priorKeys = Object.keys(chargesByMonth)
      .filter((k) => k <= targetKey)
      .sort();
    if (priorKeys.length > 0) return chargesByMonth[priorKeys[priorKeys.length - 1]];
  }
  const record = history ? recordEffectiveOn(history, dateIso) : null;
  if (record?.chargesPercent != null) return record.chargesPercent;
  return 0;
}

/** The daily rate to use for a person on a given date: computed from their
 * salary history and the social-charges rate in effect that month, if they
 * have a salary history, otherwise the given flat fallback. */
export function dailyRateOn(
  history: SalaryRecord[] | undefined,
  dateIso: string,
  fallback: number,
  chargesByMonth?: Record<string, number>,
): number {
  if (!history || history.length === 0) return fallback;
  const record = recordEffectiveOn(history, dateIso);
  if (!record) return fallback;
  const percent = socialChargesPercentOn(chargesByMonth, history, dateIso);
  return dailyRateFor(record.grossMonthlySalary, percent);
}
