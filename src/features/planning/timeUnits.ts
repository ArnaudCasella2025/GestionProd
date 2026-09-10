import {
  addDays,
  addMonths,
  eachDay,
  formatDayLabel,
  formatMonthShort,
  isSameDay,
  isWeekend,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toISODate,
} from '../../lib/dates';
import type { ZoomLevel } from '../../types';

export interface TimeUnit {
  key: string;
  label: string;
  /** ISO date range this column covers (inclusive). */
  startIso: string;
  endIso: string;
  monthGroupLabel: string;
  isToday: boolean;
  isWeekend: boolean;
  widthPx: number;
}

const WIDTH: Record<ZoomLevel, number> = { semaine: 44, mois: 30, annee: 96 };

export function unitWidth(zoom: ZoomLevel): number {
  return WIDTH[zoom];
}

export function buildUnits(anchor: Date, zoom: ZoomLevel): TimeUnit[] {
  const today = new Date();

  if (zoom === 'annee') {
    const yearStart = startOfYear(anchor);
    return Array.from({ length: 12 }, (_, i) => {
      const monthStart = addMonths(yearStart, i);
      const monthEnd = addDays(addMonths(monthStart, 1), -1);
      return {
        key: toISODate(monthStart),
        label: formatMonthShort(monthStart),
        startIso: toISODate(monthStart),
        endIso: toISODate(monthEnd),
        monthGroupLabel: String(monthStart.getFullYear()),
        isToday: today >= monthStart && today <= monthEnd,
        isWeekend: false,
        widthPx: WIDTH.annee,
      };
    });
  }

  const days =
    zoom === 'semaine'
      ? eachDay(startOfWeek(anchor), 14)
      : eachDay(startOfMonth(anchor), new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate());

  return days.map((day) => ({
    key: toISODate(day),
    label: formatDayLabel(day),
    startIso: toISODate(day),
    endIso: toISODate(day),
    monthGroupLabel: day.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    isToday: isSameDay(day, today),
    isWeekend: isWeekend(day),
    widthPx: WIDTH[zoom],
  }));
}

export function shiftAnchor(anchor: Date, zoom: ZoomLevel, direction: 1 | -1): Date {
  if (zoom === 'semaine') return addDays(anchor, direction * 14);
  if (zoom === 'mois') return addMonths(anchor, direction);
  return new Date(anchor.getFullYear() + direction, anchor.getMonth(), 1);
}

/** Returns the [startIdx, endIdx] range of units overlapping a booking's date range, or null. */
export function unitRangeForDates(units: TimeUnit[], startDateIso: string, endDateIso: string): [number, number] | null {
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < units.length; i++) {
    if (units[i].endIso >= startDateIso && startIdx === -1) startIdx = i;
    if (units[i].startIso <= endDateIso) endIdx = i;
  }
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;
  return [startIdx, endIdx];
}

/** Groups consecutive units sharing the same month-group label, for the month band header. */
export function groupByMonth(units: TimeUnit[]): { label: string; span: number }[] {
  const groups: { label: string; span: number }[] = [];
  for (const unit of units) {
    const last = groups[groups.length - 1];
    if (last && last.label === unit.monthGroupLabel) {
      last.span += 1;
    } else {
      groups.push({ label: unit.monthGroupLabel, span: 1 });
    }
  }
  return groups;
}
