import { useMemo, useState } from 'react';
import { formatFullDate, fromISODate } from '../../lib/dates';
import { createBooking } from '../../lib/repository';
import { resolveTestPersonId, useTestRole } from '../../lib/testRole';
import type { Booking, Person, Project } from '../../types';
import { ProjectResourceGrid } from './ProjectResourceGrid';
import { distributeDays } from './autoSchedule';
import { canManageProject, computeConflictDays, peopleForProject, projectDateRange } from './calc';
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
  const { role, personId } = useTestRole();
  const testPersonId = resolveTestPersonId(personId, people);
  const [anchor, setAnchor] = useState(() => new Date());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // People added to a project's grid so they can be booked, before they have
  // an actual booking there — purely local, so a person who never ends up
  // with a real booking simply drops back out (e.g. on navigating away).
  const [manualStaff, setManualStaff] = useState<Record<string, string[]>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [pickedPersonId, setPickedPersonId] = useState('');
  // Auto-distribute form — which project it's open for, and its fields.
  const [autoPlanFor, setAutoPlanFor] = useState<string | null>(null);
  const [autoPersonId, setAutoPersonId] = useState('');
  const [autoStart, setAutoStart] = useState('');
  const [autoEnd, setAutoEnd] = useState('');
  const [autoDays, setAutoDays] = useState('');
  const [autoResult, setAutoResult] = useState<string | null>(null);

  const units = useMemo(() => buildUnits(anchor, 'annee'), [anchor]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const conflictsByPerson = useMemo(() => computeConflictDays(bookings, people), [bookings, people]);

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

  function addPerson(projectId: string) {
    if (!pickedPersonId) return;
    setManualStaff((prev) => {
      const existing = prev[projectId] ?? [];
      if (existing.includes(pickedPersonId)) return prev;
      return { ...prev, [projectId]: [...existing, pickedPersonId] };
    });
    setPickedPersonId('');
    setAddingTo(null);
  }

  function runAutoDistribute(project: Project) {
    const person = peopleById.get(autoPersonId);
    const days = Number(autoDays);
    if (!person || !autoStart || !autoEnd || autoStart > autoEnd || !Number.isFinite(days) || days <= 0) return;
    const personBookings = bookings.filter((b) => b.personId === person.id);
    const { runs, scheduledCount, requestedCount } = distributeDays(person, autoStart, autoEnd, days, personBookings);
    for (const run of runs) {
      createBooking({ personId: person.id, projectId: project.id, startDate: run.startDate, endDate: run.endDate }).catch(console.error);
    }
    setAutoResult(
      scheduledCount < requestedCount
        ? `${scheduledCount} jour${scheduledCount > 1 ? 's' : ''} programmé${scheduledCount > 1 ? 's' : ''} sur ${requestedCount} demandés — ${person.name} n'a pas assez de jours disponibles sur cette période pour atteindre le total demandé.`
        : `${scheduledCount} jour${scheduledCount > 1 ? 's' : ''} programmé${scheduledCount > 1 ? 's' : ''} pour ${person.name}, réparti${scheduledCount > 1 ? 's' : ''} du ${formatFullDate(fromISODate(autoStart))} au ${formatFullDate(fromISODate(autoEnd))}.`,
    );
    setAutoDays('');
  }

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
            const canManage = role !== 'responsable' || canManageProject(project, role, testPersonId);
            const manualIds = manualStaff[project.id] ?? [];
            const extraPeople = manualIds
              .filter((id) => !projectPeople.some((p) => p.id === id))
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => Boolean(p));
            const displayPeople = [...projectPeople, ...extraPeople];
            const availableToAdd = people.filter((p) => !displayPeople.some((dp) => dp.id === p.id));
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
                    {!canManage && (
                      <p className="text-muted ppr-expanded-empty">
                        Lecture seule — vous n'êtes pas responsable de ce projet.
                      </p>
                    )}
                    {canManage &&
                      (addingTo === project.id ? (
                        <div className="pdc-toolbar" style={{ marginBottom: 'var(--space-2)' }}>
                          <select
                            className="input"
                            value={pickedPersonId}
                            onChange={(e) => setPickedPersonId(e.target.value)}
                            style={{ width: 260 }}
                            autoFocus
                          >
                            <option value="">Choisir une personne…</option>
                            {availableToAdd.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — {p.role}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="btn btn-primary" disabled={!pickedPersonId} onClick={() => addPerson(project.id)}>
                            Ajouter
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setAddingTo(null);
                              setPickedPersonId('');
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : autoPlanFor === project.id ? (
                        <>
                          <div className="pdc-toolbar" style={{ marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <select
                              className="input"
                              value={autoPersonId}
                              onChange={(e) => setAutoPersonId(e.target.value)}
                              style={{ width: 220 }}
                              autoFocus
                            >
                              <option value="">Choisir une personne…</option>
                              {people.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {p.role}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              className="input"
                              value={autoStart}
                              onChange={(e) => setAutoStart(e.target.value)}
                              aria-label="Début de la période"
                              style={{ width: 150 }}
                            />
                            <span className="text-muted">→</span>
                            <input
                              type="date"
                              className="input"
                              value={autoEnd}
                              onChange={(e) => setAutoEnd(e.target.value)}
                              aria-label="Fin de la période"
                              style={{ width: 150 }}
                            />
                            <input
                              type="number"
                              className="input"
                              min={1}
                              step={1}
                              placeholder="Jours"
                              value={autoDays}
                              onChange={(e) => setAutoDays(e.target.value)}
                              aria-label="Nombre de jours à répartir"
                              style={{ width: 90 }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={!autoPersonId || !autoStart || !autoEnd || !autoDays}
                              onClick={() => runAutoDistribute(project)}
                            >
                              Répartir
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setAutoPlanFor(null);
                                setAutoResult(null);
                              }}
                            >
                              Fermer
                            </button>
                          </div>
                          {autoResult && (
                            <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--space-2)', fontSize: 13 }}>
                              {autoResult}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="pdc-toolbar" style={{ marginBottom: 'var(--space-2)' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setAddingTo(project.id)}
                            disabled={availableToAdd.length === 0}
                          >
                            + Ajouter une personne
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setAutoPlanFor(project.id);
                              setAutoPersonId((id) => id || displayPeople[0]?.id || people[0]?.id || '');
                              setAutoResult(null);
                            }}
                            disabled={people.length === 0}
                          >
                            Planifier des jours
                          </button>
                        </div>
                      ))}
                    {displayPeople.length === 0 ? (
                      <p className="text-muted ppr-expanded-empty">Aucune ressource affectée pour l'instant.</p>
                    ) : (
                      <ProjectResourceGrid
                        project={project}
                        people={displayPeople}
                        units={units}
                        bookings={bookings}
                        projectsById={projectsById}
                        peopleById={peopleById}
                        conflictsByPerson={conflictsByPerson}
                        canBook={canManage}
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
