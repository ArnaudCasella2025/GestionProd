import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { formatFullDate, formatMonthLabel } from '../../lib/dates';
import {
  approveRequest,
  createBooking,
  deleteBooking,
  refuseRequest,
  seedDemoData,
  updateBookingDates,
  useBookings,
  usePeople,
  useProjects,
  useRequests,
} from '../../lib/repository';
import { firebaseConfigured } from '../../lib/firebase';
import type { AbsenceType, Booking, ZoomLevel } from '../../types';
import { BookingPopover } from './BookingPopover';
import { CalendarGrid, type DragSelection } from './CalendarGrid';
import { CommandPalette } from './CommandPalette';
import { ConflictsModal } from './ConflictsModal';
import { DetailPanel } from './DetailPanel';
import { NavRail } from './NavRail';
import { ProjectCards } from './ProjectCards';
import { RequestsModal } from './RequestsModal';
import { computeConflictDays, totalPersonDaysReserved } from './calc';
import { buildUnits, shiftAnchor } from './timeUnits';

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
];

interface CreatePopoverState {
  x: number;
  y: number;
  rows: [number, number];
  cols: [number, number];
}

interface DetailPanelState {
  x: number;
  y: number;
  booking: Booking;
}

export function PlanDeCharge() {
  const { data: people, loading: peopleLoading } = usePeople();
  const { data: projects } = useProjects();
  const { data: bookings } = useBookings();
  const { data: requests } = useRequests();

  const [anchor, setAnchor] = useState(() => new Date());
  const [zoom, setZoom] = useState<ZoomLevel>('semaine');
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const isDragging = useRef(false);

  const [createPopover, setCreatePopover] = useState<CreatePopoverState | null>(null);
  const [detailPanel, setDetailPanel] = useState<DetailPanelState | null>(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const units = useMemo(() => buildUnits(anchor, zoom), [anchor, zoom]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const conflictsByPerson = useMemo(() => computeConflictDays(bookings), [bookings]);

  const totalDaysReserved = useMemo(() => totalPersonDaysReserved(bookings), [bookings]);
  const conflictCount = useMemo(
    () => Array.from(conflictsByPerson.values()).reduce((sum, days) => sum + days.size, 0),
    [conflictsByPerson],
  );
  const pendingRequestCount = requests.filter((r) => r.status === 'pending').length;

  const closeAllPanels = useCallback(() => {
    setCreatePopover(null);
    setDetailPanel(null);
    setRequestsOpen(false);
    setConflictsOpen(false);
    setPaletteOpen(false);
  }, []);

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

  const handleCellMouseDown = useCallback((row: number, col: number) => {
    isDragging.current = true;
    setDragSelection({ rowA: row, colA: col, rowB: row, colB: col });
  }, []);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (!isDragging.current) return;
    setDragSelection((prev) => (prev ? { ...prev, rowB: row, colB: col } : prev));
  }, []);

  const handleCellMouseUp = useCallback(
    (evt: MouseEvent<HTMLDivElement>) => {
      if (!isDragging.current || !dragSelection) return;
      isDragging.current = false;
      const rows: [number, number] = [Math.min(dragSelection.rowA, dragSelection.rowB), Math.max(dragSelection.rowA, dragSelection.rowB)];
      const cols: [number, number] = [Math.min(dragSelection.colA, dragSelection.colB), Math.max(dragSelection.colA, dragSelection.colB)];
      setCreatePopover({ x: evt.clientX, y: evt.clientY, rows, cols });
    },
    [dragSelection],
  );

  const applyBooking = useCallback(
    (payload: { projectId?: string; absenceType?: AbsenceType }) => {
      if (!createPopover) return;
      const [rowStart, rowEnd] = createPopover.rows;
      const [colStart, colEnd] = createPopover.cols;
      const startDate = units[colStart].startIso;
      const endDate = units[colEnd].endIso;
      for (let row = rowStart; row <= rowEnd; row++) {
        const person = people[row];
        if (!person) continue;
        createBooking({ personId: person.id, startDate, endDate, ...payload }).catch(console.error);
      }
      setCreatePopover(null);
      setDragSelection(null);
    },
    [createPopover, units, people],
  );

  const handleBookingClick = useCallback((booking: Booking, evt: MouseEvent) => {
    evt.stopPropagation();
    setDetailPanel({ x: evt.clientX, y: evt.clientY, booking });
  }, []);

  const handleEditFromConflicts = useCallback((booking: Booking, evt: MouseEvent) => {
    setConflictsOpen(false);
    setDetailPanel({ x: evt.clientX, y: evt.clientY, booking });
  }, []);

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
    <div className="pdc-layout">
      <NavRail projects={projects} pendingRequestCount={pendingRequestCount} onOpenRequests={() => setRequestsOpen(true)} />

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
          <div className="pdc-popover-scrim" onClick={() => setCreatePopover(null)} />
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

      {requestsOpen && (
        <RequestsModal
          requests={requests}
          peopleById={peopleById}
          onApprove={(request) => approveRequest(request).catch(console.error)}
          onRefuse={(id) => refuseRequest(id).catch(console.error)}
          onClose={() => setRequestsOpen(false)}
        />
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
    </div>
  );
}
