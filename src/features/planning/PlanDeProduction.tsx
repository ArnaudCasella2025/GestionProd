import { useMemo, useState } from 'react';
import { addMonths, formatFullDate, formatMonthShort, fromISODate, startOfMonth, toISODate } from '../../lib/dates';
import type { Booking, Person, Project } from '../../types';
import { ProjectResourceGrid } from './ProjectResourceGrid';
import { computeConflictDays, globalBookingRange, peopleForProject, projectDateRange } from './calc';
import { buildUnits, shiftAnchor } from './timeUnits';

interface PlanDeProductionProps {
  people: Person[];
  projects: Project[];
  bookings: Booking[];
}

function percentBetween(dateIso: string, rangeStart: string, rangeEnd: string): number {
  const total = fromISODate(rangeEnd).getTime() - fromISODate(rangeStart).getTime();
  if (total <= 0) return 0;
  return ((fromISODate(dateIso).getTime() - fromISODate(rangeStart).getTime()) / total) * 100;
}

/** Month-start tick positions (as a percentage) across a date range, for the timeline header. */
function monthTicks(rangeStart: string, rangeEnd: string): { label: string; pct: number }[] {
  const ticks: { label: string; pct: number }[] = [];
  let cursor = startOfMonth(fromISODate(rangeStart));
  const end = fromISODate(rangeEnd);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    ticks.push({
      label: `${formatMonthShort(cursor)} ${cursor.getFullYear()}`,
      pct: Math.max(percentBetween(iso, rangeStart, rangeEnd), 0),
    });
    cursor = addMonths(cursor, 1);
  }
  return ticks;
}

export function PlanDeProduction({ people, projects, bookings }: PlanDeProductionProps) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const units = useMemo(() => buildUnits(anchor, 'annee'), [anchor]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const conflictsByPerson = useMemo(() => computeConflictDays(bookings), [bookings]);
  const globalRange = useMemo(() => globalBookingRange(bookings), [bookings]);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const ticks = useMemo(() => (globalRange ? monthTicks(globalRange.start, globalRange.end) : []), [globalRange]);

  const toggle = (projectId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Plan de production</h1>
        <p className="text-muted">Vue d'ensemble des projets, de leur premier au dernier jour réservé.</p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

      <div className="pdc-toolbar">
        <div className="pdc-time-nav">
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => shiftAnchor(a, 'annee', -1))} aria-label="Année précédente">
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setAnchor(new Date())}>
            Aujourd'hui
          </button>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => shiftAnchor(a, 'annee', 1))} aria-label="Année suivante">
            ›
          </button>
          <span className="pdc-anchor-label">{anchor.getFullYear()}</span>
        </div>
        <span className="text-muted pdc-toolbar-hint">
          Dépliez un projet pour réserver ses ressources sur {anchor.getFullYear()}
        </span>
      </div>

      {projects.length === 0 ? (
        <p className="text-muted">Aucun projet pour l'instant.</p>
      ) : (
        <div className="ppr-project-list">
          <div className="ppr-project-row ppr-timeline-header">
            <div className="ppr-chevron-spacer" />
            <span className="pdc-color-dot" style={{ visibility: 'hidden' }} />
            <div className="ppr-project-info" />
            <div className="ppr-sparkline-track ppr-ticks-track">
              {ticks.map((tick) => (
                <div key={tick.label} className="ppr-tick" style={{ left: `${tick.pct}%` }}>
                  {tick.label}
                </div>
              ))}
            </div>
          </div>

          {projects.map((project) => {
            const range = projectDateRange(bookings, project.id);
            const projectPeople = peopleForProject(bookings, people, project.id);
            const isExpanded = expanded.has(project.id);

            let leftPct = 0;
            let widthPct = 0;
            let todayPct: number | null = null;
            if (range && globalRange) {
              leftPct = percentBetween(range.start, globalRange.start, globalRange.end);
              const rightPct = percentBetween(range.end, globalRange.start, globalRange.end);
              widthPct = Math.max(rightPct - leftPct, 1.5);
              if (todayIso >= globalRange.start && todayIso <= globalRange.end) {
                todayPct = percentBetween(todayIso, globalRange.start, globalRange.end);
              }
            }

            return (
              <div className="ppr-project-section" key={project.id}>
                <div className="ppr-project-row">
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost ppr-chevron"
                    onClick={() => toggle(project.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Réduire' : 'Étendre'}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                  <span className="pdc-color-dot" style={{ background: project.color }} />
                  <div className="ppr-project-info">
                    <div className="ppr-project-name">{project.name}</div>
                    <div className="text-muted ppr-project-client">{project.client}</div>
                  </div>
                  <div className="ppr-sparkline-track">
                    {todayPct !== null && <div className="ppr-sparkline-today" style={{ left: `${todayPct}%` }} />}
                    {range ? (
                      <div
                        className="ppr-sparkline-bar"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: project.color }}
                        title={`${formatFullDate(fromISODate(range.start))} → ${formatFullDate(fromISODate(range.end))}`}
                      >
                        <span className="ppr-sparkline-label">{project.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted ppr-sparkline-empty">Aucune réservation</span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="ppr-expanded">
                    {projectPeople.length === 0 ? (
                      <p className="text-muted ppr-expanded-empty">Aucune ressource affectée pour l'instant.</p>
                    ) : (
                      <ProjectResourceGrid
                        project={project}
                        people={projectPeople}
                        units={units}
                        bookings={bookings}
                        projectsById={projectsById}
                        peopleById={peopleById}
                        conflictsByPerson={conflictsByPerson}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
