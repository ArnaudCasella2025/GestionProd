import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { createBooking } from '../../lib/repository';
import type { AbsenceType, Booking, DayHalf, Person } from '../../types';
import { distributeDays } from './autoSchedule';
import type { DragSelection } from './CalendarGrid';
import type { TimeUnit } from './timeUnits';

interface CreatePopoverState {
  x: number;
  y: number;
  rows: [number, number];
  cols: [number, number];
}

interface DetailPanelState {
  x: number;
  y: number;
  bookings: Booking[];
}

/**
 * Drag-to-select, create-popover and detail-panel state shared by any grid
 * that lets you book people onto time-unit columns (Plan de charge's main
 * grid, and each expanded project's resource grid in Plan de production).
 */
export function useBookingGrid(people: Person[], units: TimeUnit[], allBookings: Booking[]) {
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const isDragging = useRef(false);
  const [createPopover, setCreatePopover] = useState<CreatePopoverState | null>(null);
  const [detailPanel, setDetailPanel] = useState<DetailPanelState | null>(null);

  const closePanels = useCallback(() => {
    setCreatePopover(null);
    setDetailPanel(null);
  }, []);

  const handleCellMouseDown = useCallback((row: number, col: number) => {
    isDragging.current = true;
    setDragSelection({ rowA: row, colA: col, rowB: row, colB: col });
  }, []);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (!isDragging.current) return;
    setDragSelection((prev) => (prev ? { ...prev, rowB: row, colB: col } : prev));
  }, []);

  const handleCellMouseUp = useCallback(
    (evt: MouseEvent<HTMLDivElement>) => {
      if (!isDragging.current || !dragSelection) return;
      isDragging.current = false;
      const rows: [number, number] = [Math.min(dragSelection.rowA, dragSelection.rowB), Math.max(dragSelection.rowA, dragSelection.rowB)];
      const cols: [number, number] = [Math.min(dragSelection.colA, dragSelection.colB), Math.max(dragSelection.colA, dragSelection.colB)];
      setCreatePopover({ x: evt.clientX, y: evt.clientY, rows, cols });
    },
    [dragSelection],
  );

  const applyBooking = useCallback(
    (payload: { projectId?: string; absenceType?: AbsenceType; startHalf: DayHalf; endHalf: DayHalf; targetDays: number | null }) => {
      if (!createPopover) return;
      const [rowStart, rowEnd] = createPopover.rows;
      const [colStart, colEnd] = createPopover.cols;
      const startDate = units[colStart].startIso;
      const endDate = units[colEnd].endIso;
      // Destructured out so each branch below builds its own payload —
      // otherwise spreading `absenceType`/`projectId` unconditionally would
      // write an explicit `undefined` for whichever one the caller didn't
      // pass, and Firestore rejects that.
      const { targetDays, startHalf, endHalf, ...idFields } = payload;
      for (let row = rowStart; row <= rowEnd; row++) {
        const person = people[row];
        if (!person) continue;
        if (targetDays == null) {
          createBooking({ personId: person.id, startDate, endDate, startHalf, endHalf, ...idFields }).catch(console.error);
        } else {
          // Spread targetDays across the range instead of staffing it
          // solid — same engine as Plan de production's "Planifier des
          // jours", applied per person so each one's own off-days and
          // existing bookings are taken into account individually.
          const personBookings = allBookings.filter((b) => b.personId === person.id);
          const { runs } = distributeDays(person, startDate, endDate, targetDays, personBookings);
          for (const run of runs) {
            createBooking({ personId: person.id, startDate: run.startDate, endDate: run.endDate, ...idFields }).catch(console.error);
          }
        }
      }
      setCreatePopover(null);
      setDragSelection(null);
    },
    [createPopover, units, people, allBookings],
  );

  const handleBookingClick = useCallback((bookings: Booking[], evt: MouseEvent) => {
    evt.stopPropagation();
    setDetailPanel({ x: evt.clientX, y: evt.clientY, bookings });
  }, []);

  return {
    dragSelection,
    createPopover,
    detailPanel,
    setDetailPanel,
    closePanels,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    applyBooking,
    handleBookingClick,
  };
}
