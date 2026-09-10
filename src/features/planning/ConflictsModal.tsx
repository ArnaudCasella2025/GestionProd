import type { MouseEvent } from 'react';
import { formatFullDate, fromISODate } from '../../lib/dates';
import type { Booking, Person, Project } from '../../types';
import { conflictingBookingsForPerson } from './calc';

interface ConflictsModalProps {
  conflictsByPerson: Map<string, Set<string>>;
  bookings: Booking[];
  peopleById: Map<string, Person>;
  projectsById: Map<string, Project>;
  onEditBooking: (booking: Booking, evt: MouseEvent) => void;
  onRelease: (id: string) => void;
  onClose: () => void;
}

export function ConflictsModal({
  conflictsByPerson,
  bookings,
  peopleById,
  projectsById,
  onEditBooking,
  onRelease,
  onClose,
}: ConflictsModalProps) {
  const personIds = Array.from(conflictsByPerson.keys());

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(560px, 100%)' }}>
        <div className="dialog-title">Conflits d'affectation</div>
        {personIds.length === 0 ? (
          <p className="text-muted">Aucun conflit — tout le monde est réservé sur au plus un projet par jour.</p>
        ) : (
          <div className="pdc-conflict-list">
            {personIds.map((personId) => {
              const person = peopleById.get(personId);
              const conflictDays = conflictsByPerson.get(personId)!;
              const conflicting = conflictingBookingsForPerson(personId, bookings, conflictDays);

              return (
                <div className="pdc-conflict-group" key={personId}>
                  <div className="pdc-conflict-person">
                    {person?.name ?? 'Ressource inconnue'}
                    <span className="tag tag-accent-2">
                      {conflictDays.size} jour{conflictDays.size > 1 ? 's' : ''} en double affectation
                    </span>
                  </div>
                  {conflicting.map((booking) => {
                    const project = booking.projectId ? projectsById.get(booking.projectId) : undefined;
                    return (
                      <div className="pdc-conflict-row" key={booking.id}>
                        <span className="pdc-color-dot" style={{ background: project?.color }} />
                        <span className="pdc-conflict-row-label">
                          {project?.name ?? '—'}
                          <span className="text-muted">
                            {' '}
                            · {formatFullDate(fromISODate(booking.startDate))}
                            {booking.startDate !== booking.endDate ? ` → ${formatFullDate(fromISODate(booking.endDate))}` : ''}
                          </span>
                        </span>
                        <button type="button" className="btn btn-secondary" onClick={(e) => onEditBooking(booking, e)}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => onRelease(booking.id)}>
                          Libérer
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
