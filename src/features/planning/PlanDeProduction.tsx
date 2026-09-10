import { useMemo, useState } from 'react';
import { formatFullDate, fromISODate } from '../../lib/dates';
import type { Booking, Person, Project } from '../../types';
import { ProjectResourceGrid } from './ProjectResourceGrid';
import { computeConflictDays, peopleForProject, projectDateRange } from './calc';
import { buildUnits, groupByMonth, shiftAnchor, unitRangeForDates, type TimeUnit } from './timeUnits';

interface PlanDeProductionProps {
  people: Person[];
  projects: Project[];
  bookings: Booking[];
}

function pxBefore(units: TimeUnit[], idx: number): number {
  return units.slice(0, idx).reduce((sum, u) => sum + u.widthPx, 0);
}

export function PlanDeProduction({ people, projects, bookings }: PlanDeProductionProps) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const units = useMemo(() => buildUnits(anchor, 'annee'), [anchor]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const conflictsByPerson = useMemo(() => computeConflictDays(bookings), [bookings]);

  // The overview below uses the exact same fixed per-week pixel width as the
  // expanded per-project grids (CalendarGrid) — not a percentage of the
  // available space — so the two line up column-for-column instead of each
  // scaling to a different width.
  const trackWidth = useMemo(() => units.reduce((sum, u) => sum + u.widthPx, 0), [units]);
  const monthGroups = useMemo(() => groupByMonth(units), [units]);
  const todayLeft = useMemo(() => {
    const idx = units.findIndex((u) => u.isToday);
    return idx === -1 ? null : pxBefore(units, idx);
  }, [units]);

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
          <div className="ppr-overview-row ppr-timeline-header">
            <div className="ppr-label-col" />
            <div className="ppr-track" style={{ width: trackWidth }}>
              <div className="pdc-month-band">
                {monthGroups.map((group, i) => (
                  <div key={i} className="pdc-month-cell" style={{ width: group.span * units[0].widthPx }}>
                    {group.label}
                  </div>
                ))}
              </div>
              {todayLeft !== null && <div className="ppr-sparkline-today" style={{ left: todayLeft }} />}
            </div>
          </div>

          {projects.map((project) => {
            const range = projectDateRange(bookings, project.id);
            const projectPeople = peopleForProject(bookings, people, project.id);
            const isExpanded = expanded.has(project.id);
            const visibleRange = range ? unitRangeForDates(units, range.start, range.end) : null;

            let barLeft = 0;
            let barWidth = 0;
            if (visibleRange) {
              const [startIdx, endIdx] = visibleRange;
              barLeft = pxBefore(units, startIdx);
              barWidth = Math.max(pxBefore(units, endIdx + 1) - barLeft - 2, 6);
            }

            return (
              <div className="ppr-project-section" key={project.id}>
                <div className="ppr-overview-row">
                  <div className="ppr-label-col">
                    <button
                      type="button"
                      className="ppr-chevron"
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
                  </div>
                  <div className="ppr-track ppr-bar-track" style={{ width: trackWidth }}>
                    {todayLeft !== null && <div className="ppr-sparkline-today" style={{ left: todayLeft }} />}
                    {visibleRange && range ? (
                      <div
                        className="ppr-sparkline-bar"
                        style={{ left: barLeft, width: barWidth, background: project.color }}
                        title={`${formatFullDate(fromISODate(range.start))} → ${formatFullDate(fromISODate(range.end))}`}
                      >
                        <span className="ppr-sparkline-label">{project.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted ppr-sparkline-empty">Aucune réservation en {anchor.getFullYear()}</span>
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
