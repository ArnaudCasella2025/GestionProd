import type { CSSProperties, MouseEvent } from 'react';
import { fromISODate } from '../../lib/dates';
import type { Booking, Person, Project } from '../../types';
import { bookingLabel, isPersonCustomOffDay } from './calc';
import { groupByMonth, splitAtWeekends, unitRangeForDates, type TimeUnit } from './timeUnits';
import { useTestRole } from '../../lib/testRole';

/** A person's configured off-day only applies to day-granularity units — the
 * "année" zoom's per-week columns can't represent a single weekday off. */
function isPersonDayOff(person: Person, unit: TimeUnit): boolean {
  if (unit.isWeekend || unit.startIso !== unit.endIso) return false;
  return isPersonCustomOffDay(person, fromISODate(unit.startIso));
}

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
  onBookingClick: (bookings: Booking[], evt: MouseEvent) => void;
}

const ROW_HEIGHT = 52;
// Matches .pdc-resources-header/.pdc-resource-col's width in app.css — kept
// in sync manually, same as the Plan de production overview's own copy of
// this same constant.
const RESOURCE_COL_WIDTH = 236;

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
  const { role } = useTestRole();
  const canSeeFinancials = role !== 'user';
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
      <div className="pdc-header-row">
        <div className="pdc-resources-header" />
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
        </div>
      </div>

      <div className="pdc-body" onMouseUp={onCellMouseUp} onMouseLeave={onCellMouseUp}>
        {todayIdx >= 0 && (
          <div
            className="pdc-today-line"
            style={{ left: RESOURCE_COL_WIDTH + units.slice(0, todayIdx).reduce((s, u) => s + u.widthPx, 0) }}
          />
        )}

        {people.map((person, rowIdx) => {
          const personBookings = bookings.filter((b) => b.personId === person.id);
          const conflictDays = conflictsByPerson.get(person.id);

          return (
            <div className="pdc-row" key={person.id} style={{ height: ROW_HEIGHT }}>
              <div className="pdc-resource-col">
                <div className="pdc-resource-name">{person.name}</div>
                <div className="pdc-resource-meta">
                  {canSeeFinancials ? `${person.role} · ${person.dailyRate}€/j` : person.role}
                </div>
              </div>

              <div className="pdc-timeline-col" style={{ width: totalWidth }}>
                {units.map((unit, colIdx) => {
                  const isSelected =
                    selRows && selCols && rowIdx >= selRows[0] && rowIdx <= selRows[1] && colIdx >= selCols[0] && colIdx <= selCols[1];
                  return (
                    <div
                      key={unit.key}
                      className={`pdc-cell${isSelected ? ' is-selected' : ''}${unit.isToday ? ' is-today' : ''}${unit.isWeekend ? ' is-weekend' : ''}${isPersonDayOff(person, unit) ? ' is-day-off' : ''}`}
                      style={{ width: unit.widthPx }}
                      onMouseDown={() => onCellMouseDown(rowIdx, colIdx)}
                      onMouseEnter={() => onCellMouseEnter(rowIdx, colIdx)}
                    />
                  );
                })}

                {(() => {
                    interface BarSegment {
                      booking: Booking;
                      segStart: number;
                      segEnd: number;
                      segIdx: number;
                      key: string;
                      project?: Project;
                      label: string;
                      hasConflict: boolean;
                      isDayUnit: boolean;
                      left: number;
                      width: number;
                      leftTrimmed: boolean;
                      rightTrimmed: boolean;
                      noteDots: { key: string; left: number; note: string }[];
                    }

                    const allSegments: BarSegment[] = [];

                    personBookings.forEach((booking) => {
                      const range = unitRangeForDates(units, booking.startDate, booking.endDate);
                      if (!range) return;
                      const [startIdx, endIdx] = range;
                      const project = booking.projectId ? projectsById.get(booking.projectId) : undefined;
                      const label = bookingLabel(booking, project);
                      const hasConflict = Boolean(
                        booking.projectId &&
                          conflictDays &&
                          units.slice(startIdx, endIdx + 1).some((u) => conflictDays.has(u.startIso)),
                      );

                      // Skip weekend columns — and this person's own configured
                      // days off — instead of drawing one bar across them:
                      // nobody is booked to work on a non-worked day.
                      const segments = splitAtWeekends(units, startIdx, endIdx, (unit) => isPersonDayOff(person, unit));

                      // Day-granularity zooms only: trim half a column off the very
                      // start/end of the booking when it begins or ends mid-day.
                      const isDayUnit = units[startIdx]?.startIso === units[startIdx]?.endIso;

                      segments.forEach(([segStart, segEnd], segIdx) => {
                        let left = units.slice(0, segStart).reduce((s, u) => s + u.widthPx, 0);
                        let width = units.slice(segStart, segEnd + 1).reduce((s, u) => s + u.widthPx, 0);
                        const leftTrimmed = isDayUnit && segStart === startIdx && booking.startHalf === 'PM';
                        const rightTrimmed = isDayUnit && segEnd === endIdx && booking.endHalf === 'AM';

                        if (leftTrimmed) {
                          const half = units[segStart].widthPx / 2;
                          left += half;
                          width -= half;
                        }
                        if (rightTrimmed) {
                          width -= units[segEnd].widthPx / 2;
                        }

                        let noteDotCursor = 0;
                        const noteDots: { key: string; left: number; note: string }[] = [];
                        if (isDayUnit && booking.dayNotes) {
                          for (let idx = segStart; idx <= segEnd; idx++) {
                            const u = units[idx];
                            const note = booking.dayNotes[u.startIso];
                            if (note) {
                              noteDots.push({ key: u.key, left: noteDotCursor + u.widthPx / 2 - 2, note });
                            }
                            noteDotCursor += u.widthPx;
                          }
                        }

                        allSegments.push({
                          booking,
                          segStart,
                          segEnd,
                          segIdx,
                          key: booking.projectId ?? `absence:${booking.absenceType}`,
                          project,
                          label,
                          hasConflict,
                          isDayUnit,
                          left,
                          width,
                          leftTrimmed,
                          rightTrimmed,
                          noteDots,
                        });
                      });
                    });

                    allSegments.sort((a, b) => a.segStart - b.segStart);

                    // Several bookings for the same project/absence that land
                    // in touching or overlapping columns are grouped into one
                    // visual run — e.g. one day per week spread by "Nombre de
                    // jours à réserver" across several adjacent week columns
                    // in "année" zoom, or a run that crosses a weekend (one
                    // Booking merged Fri→Mon by the auto-distribute engine)
                    // landing in the same week-unit as another day picked
                    // separately. Two bookings can genuinely *overlap* at
                    // week granularity like that even though their actual
                    // days never do — without grouping, each would still
                    // draw its own full-width bar and label on top of the
                    // other's. Groups share: a flattened seam instead of a
                    // gutter and rounded corner at every interior edge, one
                    // label spanning the whole union, and one click target
                    // (any day in the group opens a detail panel listing
                    // every booking in it, not just whichever one the click
                    // happened to land on).
                    const groupId: number[] = [];
                    {
                      let current = -1;
                      let currentKey: string | null = null;
                      let currentMaxEnd = -Infinity;
                      allSegments.forEach((seg, i) => {
                        const touches = seg.segStart === currentMaxEnd + 1 && !allSegments[i - 1]?.rightTrimmed && !seg.leftTrimmed;
                        const overlaps = seg.segStart <= currentMaxEnd;
                        if (current >= 0 && seg.key === currentKey && (touches || overlaps)) {
                          groupId[i] = current;
                        } else {
                          current++;
                          groupId[i] = current;
                          currentKey = seg.key;
                          currentMaxEnd = -Infinity;
                        }
                        currentMaxEnd = Math.max(currentMaxEnd, seg.segEnd);
                      });
                    }

                    const groupBounds = new Map<number, { left: number; right: number }>();
                    const groupBookingsById = new Map<number, Map<string, Booking>>();
                    allSegments.forEach((seg, i) => {
                      const g = groupId[i];
                      const bounds = groupBounds.get(g);
                      const right = seg.left + seg.width;
                      if (!bounds) groupBounds.set(g, { left: seg.left, right });
                      else groupBounds.set(g, { left: Math.min(bounds.left, seg.left), right: Math.max(bounds.right, right) });
                      const byId = groupBookingsById.get(g) ?? new Map<string, Booking>();
                      byId.set(seg.booking.id, seg.booking);
                      groupBookingsById.set(g, byId);
                    });

                    // A run's label can't just live inside its first bar's own
                    // box when overflowing wider than it — same z-index
                    // siblings paint in DOM order, so the later (touching)
                    // bars would paint over it. It's rendered separately
                    // instead, after every bar, so it naturally paints on top.
                    const labelOverlays: { key: string; left: number; width: number; label: string }[] = [];
                    const labeledGroups = new Set<number>();

                    const bars = allSegments.map((seg, i) => {
                      const { booking, segIdx, project, label, hasConflict, left, width, noteDots } = seg;
                      const g = groupId[i];
                      const bounds = groupBounds.get(g)!;
                      const isGroupFirst = left === bounds.left;
                      const isGroupLast = left + width === bounds.right;

                      const style: CSSProperties = {
                        left,
                        width: Math.max(isGroupLast ? width - 3 : width, 4),
                        background: project ? project.color : 'repeating-linear-gradient(45deg, var(--color-neutral-400), var(--color-neutral-400) 4px, var(--color-neutral-200) 4px, var(--color-neutral-200) 8px)',
                      };
                      if (!isGroupFirst) {
                        style.borderTopLeftRadius = 0;
                        style.borderBottomLeftRadius = 0;
                      }
                      if (!isGroupLast) {
                        style.borderTopRightRadius = 0;
                        style.borderBottomRightRadius = 0;
                      }

                      // One label per group, sized to the group's full
                      // combined width instead of clipped to one booking's
                      // narrow slice (or duplicated across overlapping ones).
                      if (segIdx === 0 && !labeledGroups.has(g)) {
                        labeledGroups.add(g);
                        labelOverlays.push({ key: `group-${g}-label`, left: bounds.left, width: bounds.right - bounds.left, label });
                      }

                      return (
                        <button
                          key={`${booking.id}-${segIdx}`}
                          type="button"
                          className={`pdc-bar${hasConflict ? ' is-conflict' : ''}`}
                          style={style}
                          onClick={(e) => onBookingClick(Array.from(groupBookingsById.get(g)!.values()), e)}
                          title={label}
                        >
                          {noteDots.map((dot) => (
                            <span key={dot.key} className="pdc-bar-note-dot" style={{ left: dot.left }} title={dot.note} />
                          ))}
                        </button>
                      );
                    });

                    return (
                      <>
                        {bars}
                        {labelOverlays.map((overlay) => (
                          <span
                            key={overlay.key}
                            className="pdc-bar-label pdc-bar-label-overlay"
                            style={{ left: overlay.left + 6, width: Math.max(overlay.width - 12, 0) }}
                          >
                            {overlay.label}
                          </span>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
