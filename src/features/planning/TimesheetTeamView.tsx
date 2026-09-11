import { useMemo, useState } from 'react';
import { addMonths, eachDay, isWeekend, startOfMonth, toISODate } from '../../lib/dates';
import { HOURS_PER_DAY, type Person, type TimesheetDay } from '../../types';
import { declaredHoursCount } from './timesheetCalc';

interface TimesheetTeamViewProps {
  people: Person[];
  timesheets: TimesheetDay[];
}

export function TimesheetTeamView({ people, timesheets }: TimesheetTeamViewProps) {
  const [anchor, setAnchor] = useState(() => new Date());

  const monthStart = startOfMonth(anchor);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const weekdays = useMemo(
    () => eachDay(monthStart, daysInMonth).filter((d) => !isWeekend(d)),
    [monthStart, daysInMonth],
  );
  const todayIso = toISODate(new Date());

  const byPersonDate = useMemo(() => {
    const map = new Map<string, TimesheetDay>();
    for (const t of timesheets) map.set(`${t.personId}__${t.date}`, t);
    return map;
  }, [timesheets]);

  return (
    <>
      <div className="pdc-toolbar">
        <div className="pdc-time-nav">
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => addMonths(a, -1))} aria-label="Mois précédent">
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setAnchor(new Date())}>
            Aujourd'hui
          </button>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => addMonths(a, 1))} aria-label="Mois suivant">
            ›
          </button>
          <span className="pdc-anchor-label">
            {monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <span className="text-muted pdc-toolbar-hint">Les heures manquantes sur les jours passés sont en rouge</span>
      </div>

      {people.length === 0 ? (
        <p className="text-muted">Aucune ressource pour l'instant.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table ts-team-table">
            <thead>
              <tr>
                <th>Ressource</th>
                {weekdays.map((d) => (
                  <th key={toISODate(d)} style={{ textAlign: 'center' }}>
                    {d.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{person.name}</td>
                  {weekdays.map((d) => {
                    const iso = toISODate(d);
                    const day = byPersonDate.get(`${person.id}__${iso}`);
                    const declared = declaredHoursCount(day);
                    const isPast = iso < todayIso;
                    const incomplete = isPast && declared < HOURS_PER_DAY;
                    return (
                      <td key={iso} className={incomplete ? 'ts-cell-missing' : undefined} style={{ textAlign: 'center' }}>
                        {declared}/{HOURS_PER_DAY}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
