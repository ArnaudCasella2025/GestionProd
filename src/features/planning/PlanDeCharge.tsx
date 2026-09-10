import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { formatFullDate, formatMonthLabel } from '../../lib/dates';
import { deleteBooking, seedDemoData, updateBookingDates } from '../../lib/repository';
import { firebaseConfigured } from '../../lib/firebase';
import type { Booking, Person, Project, ZoomLevel } from '../../types';
import { BookingPopover } from './BookingPopover';
import { CalendarGrid } from './CalendarGrid';
import { CommandPalette } from './CommandPalette';
import { ConflictsModal } from './ConflictsModal';
import { DetailPanel } from './DetailPanel';
import { ProjectCards } from './ProjectCards';
import { computeConflictDays, totalPersonDaysReserved } from './calc';
import { buildUnits, shiftAnchor } from './timeUnits';
import { useBookingGrid } from './useBookingGrid';

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
];

interface PlanDeChargeProps {
  people: Person[];
  peopleLoading: boolean;
  projects: Project[];
  bookings: Booking[];
}

export function PlanDeCharge({ people, peopleLoading, projects, bookings }: PlanDeChargeProps) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [zoom, setZoom] = useState<ZoomLevel>('semaine');

  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const units = useMemo(() => buildUnits(anchor, zoom), [anchor, zoom]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const conflictsByPerson = useMemo(() => computeConflictDays(bookings), [bookings]);

  const {
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
  } = useBookingGrid(people, units);

  const totalDaysReserved = useMemo(() => totalPersonDaysReserved(bookings), [bookings]);
  const conflictCount = useMemo(
    () => Array.from(conflictsByPerson.values()).reduce((sum, days) => sum + days.size, 0),
    [conflictsByPerson],
  );
  const closeAllPanels = useCallback(() => {
    closePanels();
    setConflictsOpen(false);
    setPaletteOpen(false);
  }, [closePanels]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAllPanels();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeAllPanels]);

  const handleEditFromConflicts = useCallback((booking: Booking, evt: MouseEvent) => {
    setConflictsOpen(false);
    setDetailPanel({ x: evt.clientX, y: evt.clientY, booking });
  }, [setDetailPanel]);

  const handleGoToPerson = useCallback((personId: string) => {
    const idx = people.findIndex((p) => p.id === personId);
    if (idx === -1) return;
    const rowEl = document.querySelectorAll('.pdc-resource-row')[idx];
    rowEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [people]);

  const handleGoToProject = useCallback((projectId: string) => {
    const el = document.getElementById(`project-card-${projectId}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const detailPerson = detailPanel ? peopleById.get(detailPanel.booking.personId) : undefined;
  const detailProject = detailPanel?.booking.projectId ? projectsById.get(detailPanel.booking.projectId) : undefined;

  const showEmptyState = !peopleLoading && people.length === 0;

  return (
    <>
      <main className="pdc-main">
        {!firebaseConfigured && (
          <div className="pdc-warning">
            Firebase n'est pas configuré (variables <code>VITE_FIREBASE_*</code> manquantes) — voir le README pour connecter un projet
            Firebase réel.
          </div>
        )}

        <header className="pdc-header">
          <h1>Plan de charge</h1>
          <p className="text-muted">Réservez vos ressources sur les projets et suivez les conflits et le budget.</p>
          <div className="pdc-header-rule-thick" />
          <div className="pdc-header-rule-thin" />
          <div className="pdc-status-bar">
            <span>{formatFullDate(new Date())}</span>
            <span>{totalDaysReserved.toLocaleString('fr-FR')} jours·homme réservés</span>
            {conflictCount > 0 ? (
              <button type="button" className="pdc-conflict-trigger pdc-conflict-count" onClick={() => setConflictsOpen(true)}>
                {conflictCount} conflit{conflictCount > 1 ? 's' : ''}
              </button>
            ) : (
              <span>0 conflit</span>
            )}
          </div>
        </header>

        <div className="pdc-toolbar">
          <div className="pdc-time-nav">
            <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => shiftAnchor(a, zoom, -1))} aria-label="Précédent">
              ‹
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setAnchor(new Date())}>
              Aujourd'hui
            </button>
            <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => shiftAnchor(a, zoom, 1))} aria-label="Suivant">
              ›
            </button>
            <span className="pdc-anchor-label">{formatMonthLabel(anchor)}</span>
          </div>

          <div className="seg">
            {ZOOM_OPTIONS.map((opt) => (
              <label className="seg-opt" key={opt.value}>
                <input type="radio" name="zoom" checked={zoom === opt.value} onChange={() => setZoom(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>

          <span className="text-muted pdc-toolbar-hint">Glissez sur la grille pour réserver · ⌘K pour naviguer</span>
        </div>

        {showEmptyState ? (
          <div className="pdc-empty-state">
            <p>Aucune donnée dans Firestore pour l'instant.</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={seeding || !firebaseConfigured}
              onClick={async () => {
                setSeeding(true);
                try {
                  await seedDemoData();
                } catch (err) {
                  console.error(err);
                } finally {
                  setSeeding(false);
                }
              }}
            >
              {seeding ? 'Initialisation…' : 'Initialiser des données de démo'}
            </button>
          </div>
        ) : (
          <div ref={scrollRef}>
            <CalendarGrid
              people={people}
              units={units}
              bookings={bookings}
              projectsById={projectsById}
              conflictsByPerson={conflictsByPerson}
              dragSelection={dragSelection}
              onCellMouseDown={handleCellMouseDown}
              onCellMouseEnter={handleCellMouseEnter}
              onCellMouseUp={handleCellMouseUp}
              onBookingClick={handleBookingClick}
            />
          </div>
        )}

        <ProjectCards projects={projects} bookings={bookings} people={people} />
      </main>

      {createPopover && (
        <>
          <div className="pdc-popover-scrim" onClick={closePanels} />
          <BookingPopover
            x={createPopover.x}
            y={createPopover.y}
            projects={projects}
            onSelectProject={(projectId) => applyBooking({ projectId })}
            onSelectAbsence={(absenceType) => applyBooking({ absenceType })}
          />
        </>
      )}

      {detailPanel && (
        <>
          <div className="pdc-popover-scrim" onClick={() => setDetailPanel(null)} />
          <DetailPanel
            key={detailPanel.booking.id}
            x={detailPanel.x}
            y={detailPanel.y}
            booking={detailPanel.booking}
            person={detailPerson}
            project={detailProject}
            onRelease={() => {
              deleteBooking(detailPanel.booking.id).catch(console.error);
              setDetailPanel(null);
            }}
            onSaveDates={(startDate, endDate, startHalf, endHalf) => {
              updateBookingDates(detailPanel.booking.id, startDate, endDate, startHalf, endHalf).catch(console.error);
              setDetailPanel(null);
            }}
          />
        </>
      )}

      {conflictsOpen && (
        <ConflictsModal
          conflictsByPerson={conflictsByPerson}
          bookings={bookings}
          peopleById={peopleById}
          projectsById={projectsById}
          onEditBooking={handleEditFromConflicts}
          onRelease={(id) => deleteBooking(id).catch(console.error)}
          onClose={() => setConflictsOpen(false)}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          people={people}
          projects={projects}
          onGoToPerson={handleGoToPerson}
          onGoToProject={handleGoToProject}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </>
  );
}
