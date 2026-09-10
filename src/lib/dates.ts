export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = (next.getDay() + 6) % 7; // Monday = 0
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function eachDay(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function dateRangeOverlapsDay(startIso: string, endIso: string, day: Date): boolean {
  const iso = toISODate(day);
  return startIso <= iso && iso <= endIso;
}

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = fromISODate(startIso);
  const end = fromISODate(endIso);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

const dayLabelFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const monthLabelFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const monthShortFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDayLabel(date: Date): string {
  return dayLabelFormatter.format(date);
}

export function formatMonthLabel(date: Date): string {
  return monthLabelFormatter.format(date);
}

export function formatMonthShort(date: Date): string {
  return monthShortFormatter.format(date);
}

export function formatFullDate(date: Date): string {
  return fullDateFormatter.format(date);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
