import { Fragment, useMemo, useState } from 'react';
import { addMonths, eachDay, isWeekend, startOfMonth, toISODate } from '../../lib/dates';
import { ABSENCE_LABELS, HOURS_PER_DAY, type AbsenceType, type Person, type Project, type TimesheetDay } from '../../types';
import { declaredHoursCount } from './timesheetCalc';

interface TimesheetTeamViewProps {
  people: Person[];
  projects: Project[];
  timesheets: TimesheetDay[];
}

interface ActivityRow {
  key: string;
  label: string;
  color?: string;
  perDate: Map<string, number>;
}

const ALL = '__all__';

/** Green on exactly 7h, grey below, red above 7h. Non-worked days (weekend for now —
 * this app has no public-holiday calendar yet) are left blank/white, not scored. */
function cellClass(count: number, day: Date): string {
  if (isWeekend(day)) return 'ts-cell-off';
  if (count > HOURS_PER_DAY) return 'ts-cell-alert';
  if (count === HOURS_PER_DAY) return 'ts-cell-complete';
  return 'ts-cell-under';
}

export function TimesheetTeamView({ people, projects, timesheets }: TimesheetTeamViewProps) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [personFilter, setPersonFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const monthStart = startOfMonth(anchor);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const monthDays = useMemo(() => eachDay(monthStart, daysInMonth), [monthStart, daysInMonth]);

  const byPersonDate = useMemo(() => {
    const map = new Map<string, TimesheetDay>();
    for (const t of timesheets) map.set(`${t.personId}__${t.date}`, t);
    return map;
  }, [timesheets]);

  // Per person, hours declared each day broken down by which project/absence they went to.
  const activityRowsByPerson = useMemo(() => {
    const monthDates = new Set(monthDays.map((d) => toISODate(d)));
    const byPerson = new Map<string, Map<string, ActivityRow>>();
    for (const t of timesheets) {
      if (!monthDates.has(t.date)) continue;
      let activities = byPerson.get(t.personId);
      if (!activities) {
        activities = new Map();
        byPerson.set(t.personId, activities);
      }
      for (const slot of t.hours) {
        if (!slot) continue;
        const key = slot.projectId ?? `absence:${slot.absenceType}`;
        let row = activities.get(key);
        if (!row) {
          const project = slot.projectId ? projectsById.get(slot.projectId) : undefined;
          row = {
            key,
            label: slot.projectId ? (project?.name ?? 'Projet supprimé') : ABSENCE_LABELS[slot.absenceType as AbsenceType],
            color: project?.color,
            perDate: new Map(),
          };
          activities.set(key, row);
        }
        row.perDate.set(t.date, (row.perDate.get(t.date) ?? 0) + 1);
      }
    }
    const result = new Map<string, ActivityRow[]>();
    for (const [personId, activities] of byPerson) {
      result.set(personId, [...activities.values()].sort((a, b) => a.label.localeCompare(b.label)));
    }
    return result;
  }, [timesheets, monthDays, projectsById]);

  const visiblePeople = personFilter === ALL ? people : people.filter((p) => p.id === personFilter);

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
        <span className="text-muted pdc-toolbar-hint">
          Vert = 7h déclarées · Gris = incomplet · Rouge = heures sup. · Blanc = jour non travaillé
        </span>
      </div>

      <div className="pdc-toolbar">
        <div className="field" style={{ marginBottom: 0 }}>
          <select className="input" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} style={{ width: 220 }}>
            <option value={ALL}>Toutes les ressources</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <select className="input" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={{ width: 220 }}>
            <option value={ALL}>Tous les projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="text-muted">Aucune ressource pour l'instant.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table ts-team-table">
            <thead>
              <tr>
                <th>Ressource / Projet</th>
                {monthDays.map((d) => (
                  <th key={toISODate(d)} style={{ textAlign: 'center' }}>
                    {d.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePeople.map((person) => {
                const activities = (activityRowsByPerson.get(person.id) ?? []).filter(
                  (row) => projectFilter === ALL || row.key === projectFilter,
                );

                if (projectFilter !== ALL) {
                  // A specific project is selected: show only that activity's row, no person total
                  // (the total mixes every project, so it wouldn't mean much filtered down like this).
                  return activities.map((row) => (
                    <tr key={`${person.id}__${row.key}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {row.color && <span className="pdc-color-dot" style={{ background: row.color, marginRight: 6 }} />}
                        {!row.color && <span className="pdc-color-dot pdc-color-dot-hatch" style={{ marginRight: 6 }} />}
                        {person.name} — {row.label}
                      </td>
                      {monthDays.map((d) => {
                        const iso = toISODate(d);
                        const count = row.perDate.get(iso) ?? 0;
                        return (
                          <td key={iso} className={cellClass(count, d)} style={{ textAlign: 'center' }}>
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                }

                return (
                  <Fragment key={person.id}>
                    <tr>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 'var(--font-heading-weight)' }}>{person.name}</td>
                      {monthDays.map((d) => {
                        const iso = toISODate(d);
                        const declared = declaredHoursCount(byPersonDate.get(`${person.id}__${iso}`));
                        return (
                          <td key={iso} className={cellClass(declared, d)} style={{ textAlign: 'center' }}>
                            {declared}
                          </td>
                        );
                      })}
                    </tr>
                    {activities.map((row) => (
                      <tr key={`${person.id}__${row.key}`} className="ts-team-subrow">
                        <td style={{ whiteSpace: 'nowrap', paddingLeft: 'var(--space-4)' }}>
                          {row.color && <span className="pdc-color-dot" style={{ background: row.color, marginRight: 6 }} />}
                          {!row.color && <span className="pdc-color-dot pdc-color-dot-hatch" style={{ marginRight: 6 }} />}
                          {row.label}
                        </td>
                        {monthDays.map((d) => {
                          const iso = toISODate(d);
                          const count = row.perDate.get(iso) ?? 0;
                          return (
                            <td key={iso} className={cellClass(count, d)} style={{ textAlign: 'center' }}>
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
