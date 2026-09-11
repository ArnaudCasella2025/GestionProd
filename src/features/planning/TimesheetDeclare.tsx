import { useMemo, useState, type MouseEvent } from 'react';
import { addDays, eachDay, formatDayLabel, formatFullDate, fromISODate, isWeekend, startOfWeek, toISODate } from '../../lib/dates';
import { setTimesheetDay } from '../../lib/repository';
import {
  ABSENCE_LABELS,
  HOURS_PER_DAY,
  TIMESHEET_HOURS,
  type AbsenceType,
  type Person,
  type Project,
  type TimesheetDay,
  type TimesheetHourSlot,
} from '../../types';
import { TimesheetHourPopover } from './TimesheetHourPopover';
import { declaredHoursCount, isOvertimeHour, missingDaysForPerson, totalMissingHours } from './timesheetCalc';

interface TimesheetDeclareProps {
  people: Person[];
  projects: Project[];
  timesheets: TimesheetDay[];
}

interface ActiveCell {
  date: string;
  hourIndex: number;
  x: number;
  y: number;
}

const LOOKBACK_DAYS = 60;

export function TimesheetDeclare({ people, projects, timesheets }: TimesheetDeclareProps) {
  const [personId, setPersonId] = useState(() => people[0]?.id ?? '');
  const [anchor, setAnchor] = useState(() => new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const byDate = useMemo(() => {
    const map = new Map<string, TimesheetDay>();
    for (const t of timesheets) if (t.personId === personId) map.set(t.date, t);
    return map;
  }, [timesheets, personId]);

  const weekDays = useMemo(() => eachDay(startOfWeek(anchor), 7), [anchor]);
  const todayIso = toISODate(new Date());

  const missing = useMemo(() => missingDaysForPerson(personId, timesheets, LOOKBACK_DAYS), [personId, timesheets]);
  const totalMissing = totalMissingHours(missing);

  function hoursFor(date: string): (TimesheetHourSlot | null)[] {
    const day = byDate.get(date);
    const hours = day ? [...day.hours] : [];
    while (hours.length < TIMESHEET_HOURS.length) hours.push(null);
    return hours;
  }

  function assign(slot: TimesheetHourSlot | null) {
    if (!activeCell) return;
    const hours = hoursFor(activeCell.date);
    hours[activeCell.hourIndex] = slot;
    setTimesheetDay(personId, activeCell.date, hours).catch(console.error);
    setActiveCell(null);
  }

  const activeSlot = activeCell ? hoursFor(activeCell.date)[activeCell.hourIndex] : null;

  return (
    <>
      {totalMissing > 0 && (
        <div className="pdc-warning ts-alert">
          <div className="ts-alert-row">
            <span>
              Il manque <strong>{totalMissing} heure{totalMissing > 1 ? 's' : ''}</strong> à déclarer sur les jours
              passés.
            </span>
            <button type="button" className="pdc-conflict-trigger" onClick={() => setDetailsOpen((v) => !v)}>
              {detailsOpen ? 'Masquer' : 'Détails'}
            </button>
          </div>
          {detailsOpen && (
            <div className="ts-missing-list">
              {missing.map((m) => (
                <div key={m.date} className="ts-missing-row">
                  <span>{formatFullDate(fromISODate(m.date))}</span>
                  <span>
                    {m.missing} h manquante{m.missing > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pdc-toolbar">
        <div className="field" style={{ marginBottom: 0 }}>
          <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)} style={{ width: 260 }}>
            {people.length === 0 && <option value="">Aucune ressource</option>}
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.role}
              </option>
            ))}
          </select>
        </div>

        <div className="pdc-time-nav">
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => addDays(a, -7))} aria-label="Semaine précédente">
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setAnchor(new Date())}>
            Aujourd'hui
          </button>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => addDays(a, 7))} aria-label="Semaine suivante">
            ›
          </button>
        </div>

        <span className="text-muted pdc-toolbar-hint">Cliquez sur une heure pour l'affecter à un projet ou une absence</span>
      </div>

      {!personId ? (
        <p className="text-muted">Aucune ressource disponible.</p>
      ) : (
        <div className="ts-week">
          <div className="ts-hours-header">
            <div className="ts-day-label" />
            <div className="ts-hour-cells">
              {TIMESHEET_HOURS.map((hour) => (
                <div key={hour} className={`ts-hour-head${!isOvertimeHour(hour) ? ' ts-hour-head-office' : ''}`}>
                  {hour}h
                </div>
              ))}
            </div>
          </div>

          {weekDays.map((day) => {
            const iso = toISODate(day);
            const hours = hoursFor(iso);
            const declared = declaredHoursCount(byDate.get(iso));
            const weekend = isWeekend(day);
            const incomplete = !weekend && iso < todayIso && declared < HOURS_PER_DAY;

            return (
              <div
                className={`ts-day-row${incomplete ? ' ts-day-incomplete' : ''}${weekend ? ' ts-day-weekend' : ''}`}
                key={iso}
              >
                <div className="ts-day-label">
                  {formatDayLabel(day)}
                  {iso === todayIso && <span className="tag tag-accent" style={{ marginLeft: 6 }}>Aujourd'hui</span>}
                </div>
                <div className="ts-hour-cells">
                  {hours.map((slot, hourIndex) => {
                    const hour = TIMESHEET_HOURS[hourIndex];
                    // A weekend has no office hours at all — every hour on it counts as extra time.
                    const overtime = weekend || isOvertimeHour(hour);
                    const project = slot?.projectId ? projectsById.get(slot.projectId) : undefined;
                    const activity = slot
                      ? slot.projectId
                        ? (project?.name ?? 'Projet supprimé')
                        : ABSENCE_LABELS[slot.absenceType as AbsenceType]
                      : null;
                    const label = `${hour}h – ${hour + 1}h${activity ? ` · ${activity}` : ''}${overtime ? ' (heure sup.)' : ''}`;
                    const style = slot
                      ? {
                          background: project
                            ? project.color
                            : 'repeating-linear-gradient(45deg, var(--color-neutral-400), var(--color-neutral-400) 3px, var(--color-neutral-200) 3px, var(--color-neutral-200) 6px)',
                        }
                      : undefined;

                    return (
                      <button
                        key={hourIndex}
                        type="button"
                        className={`ts-hour-cell${!slot ? ' ts-hour-empty' : ''}${!overtime ? ' ts-hour-office' : ''}`}
                        style={style}
                        title={label}
                        onClick={(e: MouseEvent) => setActiveCell({ date: iso, hourIndex, x: e.clientX, y: e.clientY })}
                      />
                    );
                  })}
                </div>
                <div className="ts-day-total">
                  {declared}/{HOURS_PER_DAY} h
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeCell && (
        <>
          <div className="pdc-popover-scrim" onClick={() => setActiveCell(null)} />
          <TimesheetHourPopover
            x={activeCell.x}
            y={activeCell.y}
            projects={projects}
            hasValue={activeSlot != null}
            onSelectProject={(projectId) => assign({ projectId })}
            onSelectAbsence={(absenceType) => assign({ absenceType })}
            onClear={() => assign(null)}
          />
        </>
      )}
    </>
  );
}
