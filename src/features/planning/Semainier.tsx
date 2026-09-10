import { useMemo, useState } from 'react';
import { deleteBooking, updateBookingDates } from '../../lib/repository';
import type { Booking, Person, Project, ZoomLevel } from '../../types';
import { BookingPopover } from './BookingPopover';
import { CalendarGrid } from './CalendarGrid';
import { DetailPanel } from './DetailPanel';
import { computeConflictDays } from './calc';
import { buildUnits, shiftAnchor } from './timeUnits';
import { useBookingGrid } from './useBookingGrid';

interface SemainierProps {
  people: Person[];
  projects: Project[];
  bookings: Booking[];
}

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
];

export function Semainier({ people, projects, bookings }: SemainierProps) {
  const [personId, setPersonId] = useState<string>(() => people[0]?.id ?? '');
  const [anchor, setAnchor] = useState(() => new Date());
  const [zoom, setZoom] = useState<ZoomLevel>('semaine');

  const person = people.find((p) => p.id === personId);
  const selectedPeople = useMemo(() => (person ? [person] : []), [person]);
  const units = useMemo(() => buildUnits(anchor, zoom), [anchor, zoom]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
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
  } = useBookingGrid(selectedPeople, units);

  const detailProject = detailPanel?.booking.projectId ? projectsById.get(detailPanel.booking.projectId) : undefined;

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Semainier</h1>
        <p className="text-muted">
          Ce qu'une ressource est amenée à travailler, semaine par semaine. Réservé aux chargés de production et à la
          direction — voir le README concernant les droits d'accès, pas encore appliqués côté serveur.
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
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => shiftAnchor(a, zoom, -1))} aria-label="Précédent">
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setAnchor(new Date())}>
            Aujourd'hui
          </button>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setAnchor((a) => shiftAnchor(a, zoom, 1))} aria-label="Suivant">
            ›
          </button>
        </div>

        <div className="seg">
          {ZOOM_OPTIONS.map((opt) => (
            <label className="seg-opt" key={opt.value}>
              <input type="radio" name="semainier-zoom" checked={zoom === opt.value} onChange={() => setZoom(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {!person ? (
        <p className="text-muted">Sélectionnez une ressource pour voir son semainier.</p>
      ) : (
        <CalendarGrid
          people={selectedPeople}
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
      )}

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
            person={person}
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
    </main>
  );
}
