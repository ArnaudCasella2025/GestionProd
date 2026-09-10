import type { CSSProperties, MouseEvent } from 'react';
import type { Booking, Person, Project } from '../../types';
import { ABSENCE_LABELS } from '../../types';
import { groupByMonth, unitRangeForDates, type TimeUnit } from './timeUnits';

export interface DragSelection {
  rowA: number;
  colA: number;
  rowB: number;
  colB: number;
}

interface CalendarGridProps {
  people: Person[];
  units: TimeUnit[];
  bookings: Booking[];
  projectsById: Map<string, Project>;
  conflictsByPerson: Map<string, Set<string>>;
  dragSelection: DragSelection | null;
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onCellMouseUp: (evt: MouseEvent<HTMLDivElement>) => void;
  onBookingClick: (booking: Booking, evt: MouseEvent) => void;
}

const ROW_HEIGHT = 52;

export function CalendarGrid({
  people,
  units,
  bookings,
  projectsById,
  conflictsByPerson,
  dragSelection,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  onBookingClick,
}: CalendarGridProps) {
  const monthGroups = groupByMonth(units);
  const totalWidth = units.reduce((sum, u) => sum + u.widthPx, 0);
  const todayIdx = units.findIndex((u) => u.isToday);

  const selRows = dragSelection
    ? [Math.min(dragSelection.rowA, dragSelection.rowB), Math.max(dragSelection.rowA, dragSelection.rowB)]
    : null;
  const selCols = dragSelection
    ? [Math.min(dragSelection.colA, dragSelection.colB), Math.max(dragSelection.colA, dragSelection.colB)]
    : null;

  return (
    <div className="pdc-grid-wrap">
      <div className="pdc-resources">
        <div className="pdc-resources-header" />
        {people.map((person) => (
          <div className="pdc-resource-row" key={person.id} style={{ height: ROW_HEIGHT }}>
            <div className="pdc-resource-name">{person.name}</div>
            <div className="pdc-resource-meta">
              {person.role} · {person.dailyRate}€/j
            </div>
          </div>
        ))}
      </div>

      <div className="pdc-scroll">
        <div style={{ width: totalWidth }}>
          <div className="pdc-month-band">
            {monthGroups.map((group, i) => (
              <div key={i} className="pdc-month-cell" style={{ width: group.span * units[0]?.widthPx }}>
                {group.label}
              </div>
            ))}
          </div>
          <div className="pdc-day-header">
            {units.map((unit) => (
              <div
                key={unit.key}
                className={`pdc-day-cell${unit.isToday ? ' is-today' : ''}${unit.isWeekend ? ' is-weekend' : ''}`}
                style={{ width: unit.widthPx }}
              >
                {unit.label}
              </div>
            ))}
          </div>

          <div className="pdc-body" onMouseUp={onCellMouseUp} onMouseLeave={onCellMouseUp}>
            {todayIdx >= 0 && (
              <div
                className="pdc-today-line"
                style={{ left: units.slice(0, todayIdx).reduce((s, u) => s + u.widthPx, 0) }}
              />
            )}

            {people.map((person, rowIdx) => {
              const personBookings = bookings.filter((b) => b.personId === person.id);
              const conflictDays = conflictsByPerson.get(person.id);

              return (
                <div className="pdc-row" key={person.id} style={{ height: ROW_HEIGHT }}>
                  {units.map((unit, colIdx) => {
                    const isSelected =
                      selRows && selCols && rowIdx >= selRows[0] && rowIdx <= selRows[1] && colIdx >= selCols[0] && colIdx <= selCols[1];
                    return (
                      <div
                        key={unit.key}
                        className={`pdc-cell${isSelected ? ' is-selected' : ''}${unit.isToday ? ' is-today' : ''}${unit.isWeekend ? ' is-weekend' : ''}`}
                        style={{ width: unit.widthPx }}
                        onMouseDown={() => onCellMouseDown(rowIdx, colIdx)}
                        onMouseEnter={() => onCellMouseEnter(rowIdx, colIdx)}
                      />
                    );
                  })}

                  {personBookings.map((booking) => {
                    const range = unitRangeForDates(units, booking.startDate, booking.endDate);
                    if (!range) return null;
                    const [startIdx, endIdx] = range;
                    const left = units.slice(0, startIdx).reduce((s, u) => s + u.widthPx, 0);
                    const width = units.slice(startIdx, endIdx + 1).reduce((s, u) => s + u.widthPx, 0);
                    const project = booking.projectId ? projectsById.get(booking.projectId) : undefined;
                    const hasConflict =
                      booking.projectId &&
                      conflictDays &&
                      units.slice(startIdx, endIdx + 1).some((u) => conflictDays.has(u.startIso));

                    const style: CSSProperties = {
                      left,
                      width: Math.max(width - 3, 4),
                      background: project ? project.color : 'repeating-linear-gradient(45deg, var(--color-neutral-400), var(--color-neutral-400) 4px, var(--color-neutral-200) 4px, var(--color-neutral-200) 8px)',
                    };

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        className={`pdc-bar${hasConflict ? ' is-conflict' : ''}`}
                        style={style}
                        onClick={(e) => onBookingClick(booking, e)}
                        title={project ? project.name : ABSENCE_LABELS[booking.absenceType!]}
                      >
                        <span className="pdc-bar-label">{project ? project.name : ABSENCE_LABELS[booking.absenceType!]}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
