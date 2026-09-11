import { useMemo, useState } from 'react';
import { toISODate } from '../../lib/dates';
import { deleteAllocationOverride, setAllocationOverride } from '../../lib/repository';
import type { AllocationOverride, Booking, Person, Project, TimesheetDay } from '../../types';
import { bookedDaysInMonth, realDaysInMonth } from './allocationCalc';

interface PermanentAllocationsProps {
  people: Person[];
  projects: Project[];
  bookings: Booking[];
  timesheets: TimesheetDay[];
  allocationOverrides: AllocationOverride[];
}

type Unit = 'jours' | 'euro';
type Mode = 'officiel' | 'reel';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LABELS = MONTHS.map((m) => new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' }));

type MonthStatus = 'past' | 'current' | 'future';

function monthStatus(year: number, month: number): MonthStatus {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) return 'past';
  if (year > currentYear || (year === currentYear && month > currentMonth)) return 'future';
  return 'current';
}

const MONTH_STATUS_LABEL: Record<MonthStatus, string> = {
  past: 'Déclaré',
  current: 'En cours',
  future: 'Projeté',
};
const MONTH_STATUS_TAG_CLASS: Record<MonthStatus, string> = {
  past: 'tag-accent',
  current: 'tag-accent-2',
  future: 'tag-outline',
};

export function PermanentAllocations({ people, projects, bookings, timesheets, allocationOverrides }: PermanentAllocationsProps) {
  const [personId, setPersonId] = useState(() => people[0]?.id ?? '');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [unit, setUnit] = useState<Unit>('jours');
  const [mode, setMode] = useState<Mode>('officiel');
  const [editingCell, setEditingCell] = useState<{ projectId: string; month: number } | null>(null);
  const [draft, setDraft] = useState('');

  const person = people.find((p) => p.id === personId);
  const todayIso = toISODate(new Date());

  const personBookings = useMemo(
    () => bookings.filter((b) => b.personId === personId && b.projectId),
    [bookings, personId],
  );
  const personTimesheets = useMemo(() => timesheets.filter((t) => t.personId === personId), [timesheets, personId]);
  const overrideByKey = useMemo(() => {
    const map = new Map<string, AllocationOverride>();
    for (const o of allocationOverrides) {
      if (o.personId === personId && o.year === year) map.set(`${o.projectId}__${o.month}`, o);
    }
    return map;
  }, [allocationOverrides, personId, year]);

  function daysFor(projectId: string, month: number): number {
    const relevant = personBookings.filter((b) => b.projectId === projectId);
    if (mode === 'reel') {
      return realDaysInMonth(relevant, personTimesheets, projectId, year, month, todayIso);
    }
    const override = overrideByKey.get(`${projectId}__${month}`);
    return override ? override.days : bookedDaysInMonth(relevant, year, month);
  }

  function toDisplayNumber(days: number): number {
    return unit === 'euro' ? Math.round(days * (person?.dailyRate ?? 0)) : Math.round(days * 10) / 10;
  }

  function formatCell(days: number): string {
    if (days === 0) return '—';
    const value = toDisplayNumber(days).toLocaleString('fr-FR');
    return unit === 'euro' ? `${value} €` : value;
  }

  function startEdit(projectId: string, month: number) {
    if (mode !== 'officiel') return;
    const days = daysFor(projectId, month);
    setDraft(days === 0 ? '' : String(toDisplayNumber(days)));
    setEditingCell({ projectId, month });
  }

  function commitEdit() {
    if (!editingCell || !person) return;
    const { projectId, month } = editingCell;
    const raw = draft.trim().replace(',', '.');
    if (raw === '') {
      deleteAllocationOverride(personId, projectId, year, month).catch(console.error);
    } else {
      const entered = Number(raw);
      if (!Number.isNaN(entered)) {
        const days = unit === 'euro' ? (person.dailyRate > 0 ? entered / person.dailyRate : 0) : entered;
        setAllocationOverride(personId, projectId, year, month, days).catch(console.error);
      }
    }
    setEditingCell(null);
  }

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Affectation des permanents</h1>
        <p className="text-muted">
          Répartition mensuelle d'une ressource sur les projets, en jours ou en euros. Le mode « Officiel » est le plan
          (calculé depuis le Plan de charge, modifiable à la main) ; le mode « Réel » calcule le réalisé via les
          timesheets pour les mois passés, et le prévisionnel booké pour les mois à venir.
        </p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

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
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setYear((y) => y - 1)} aria-label="Année précédente">
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setYear(new Date().getFullYear())}>
            Aujourd'hui
          </button>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setYear((y) => y + 1)} aria-label="Année suivante">
            ›
          </button>
          <span className="pdc-anchor-label">{year}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="pa-unit" checked={unit === 'jours'} onChange={() => setUnit('jours')} />
              Jours
            </label>
            <label className="seg-opt">
              <input type="radio" name="pa-unit" checked={unit === 'euro'} onChange={() => setUnit('euro')} />
              Euros
            </label>
          </div>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="pa-mode" checked={mode === 'officiel'} onChange={() => setMode('officiel')} />
              Officiel
            </label>
            <label className="seg-opt">
              <input type="radio" name="pa-mode" checked={mode === 'reel'} onChange={() => setMode('reel')} />
              Réel
            </label>
          </div>
        </div>
      </div>

      {!person || projects.length === 0 ? (
        <p className="text-muted">Aucune ressource ou aucun projet pour l'instant.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={`table pa-table${mode === 'reel' ? ' pa-table-reel' : ''}`}>
            <thead>
              <tr>
                <th>Mois</th>
                {projects.map((project) => (
                  <th key={project.id}>
                    <span className="pdc-color-dot" style={{ background: project.color, marginRight: 6 }} />
                    {project.name}
                    <div className="pa-budget-hint">Budget : {project.budget.toLocaleString('fr-FR')} €</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((month, i) => {
                const status = monthStatus(year, month);
                return (
                <tr key={month}>
                  <td style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                    {MONTH_LABELS[i]}
                    {mode === 'reel' && (
                      <span className={`tag ${MONTH_STATUS_TAG_CLASS[status]}`} style={{ marginLeft: 6, textTransform: 'none' }}>
                        {MONTH_STATUS_LABEL[status]}
                      </span>
                    )}
                  </td>
                  {projects.map((project) => {
                    const isEditing = editingCell?.projectId === project.id && editingCell.month === month;
                    const days = daysFor(project.id, month);
                    const hasOverride = mode === 'officiel' && overrideByKey.has(`${project.id}__${month}`);

                    return (
                      <td key={project.id} className="pa-cell">
                        {isEditing ? (
                          <input
                            autoFocus
                            className="input pa-cell-input"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className={`pa-cell-btn${hasOverride ? ' pa-cell-override' : ''}`}
                            disabled={mode !== 'officiel'}
                            onClick={() => startEdit(project.id, month)}
                            title={mode === 'officiel' ? "Cliquez pour modifier — laissez vide pour revenir au calcul automatique" : undefined}
                          >
                            {formatCell(days)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
              <tr className="pa-total-row">
                <td>Total déclaré</td>
                {projects.map((project) => {
                  const total = MONTHS.reduce((sum, month) => sum + daysFor(project.id, month), 0);
                  return (
                    <td key={project.id} style={{ textAlign: 'center' }}>
                      {formatCell(total)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
