import { formatFullDate, fromISODate } from '../../lib/dates';
import { ABSENCE_LABELS, type Booking, type Person, type Project } from '../../types';

interface DetailPanelProps {
  x: number;
  y: number;
  booking: Booking;
  person: Person | undefined;
  project: Project | undefined;
  onRelease: () => void;
}

export function DetailPanel({ x, y, booking, person, project, onRelease }: DetailPanelProps) {
  const days =
    Math.round((fromISODate(booking.endDate).getTime() - fromISODate(booking.startDate).getTime()) / 86_400_000) + 1;
  const cost = person ? days * person.dailyRate : 0;

  return (
    <div className="pdc-popover card elev-lg" style={{ left: x, top: y }}>
      <div className="pdc-detail-title">{person?.name ?? 'Ressource inconnue'}</div>
      <div className="pdc-detail-row">
        <span className="text-muted">Sur</span>
        <span>{project ? project.name : ABSENCE_LABELS[booking.absenceType!]}</span>
      </div>
      <div className="pdc-detail-row">
        <span className="text-muted">Période</span>
        <span>
          {formatFullDate(fromISODate(booking.startDate))}
          {booking.startDate !== booking.endDate ? ` → ${formatFullDate(fromISODate(booking.endDate))}` : ''}
        </span>
      </div>
      {project && (
        <div className="pdc-detail-row">
          <span className="text-muted">Coût</span>
          <span>
            {days} j · {cost.toLocaleString('fr-FR')} €
          </span>
        </div>
      )}
      <button type="button" className="btn btn-secondary btn-block" onClick={onRelease}>
        Libérer
      </button>
    </div>
  );
}
