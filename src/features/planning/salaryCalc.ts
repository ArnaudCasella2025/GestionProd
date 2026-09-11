import { WORKING_DAYS_PER_MONTH, type SalaryRecord } from '../../types';

export function chargeAmount(record: SalaryRecord): number {
  return Math.round(record.grossMonthlySalary * (record.chargesPercent / 100));
}

export function loadedMonthlyCost(record: SalaryRecord): number {
  return record.grossMonthlySalary + chargeAmount(record);
}

/** The daily rate (TJM) implied by one salary record, loaded with its social charges. */
export function dailyRateFor(record: SalaryRecord): number {
  return Math.round((loadedMonthlyCost(record) / WORKING_DAYS_PER_MONTH) * 100) / 100;
}

/** The salary record in effect on a given date — the latest one whose
 * startDate is on or before it. Null if the history is empty or every
 * record starts after that date. */
export function recordEffectiveOn(history: SalaryRecord[], dateIso: string): SalaryRecord | null {
  const applicable = history.filter((r) => r.startDate <= dateIso).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return applicable[0] ?? null;
}

/** The daily rate to use for a person on a given date: computed from their
 * salary history if they have one, otherwise the given flat fallback. */
export function dailyRateOn(history: SalaryRecord[] | undefined, dateIso: string, fallback: number): number {
  if (!history || history.length === 0) return fallback;
  const record = recordEffectiveOn(history, dateIso);
  return record ? dailyRateFor(record) : fallback;
}
