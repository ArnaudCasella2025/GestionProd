import { useState } from 'react';
import { fromISODate } from '../../lib/dates';
import { ABSENCE_LABELS, type Booking, type Person, type Project } from '../../types';

interface DetailPanelProps {
  x: number;
  y: number;
  booking: Booking;
  person: Person | undefined;
  project: Project | undefined;
  onRelease: () => void;
  onSaveDates: (startDate: string, endDate: string) => void;
}

export function DetailPanel({ x, y, booking, person, project, onRelease, onSaveDates }: DetailPanelProps) {
  const [startDate, setStartDate] = useState(booking.startDate);
  const [endDate, setEndDate] = useState(booking.endDate);

  const invalidRange = endDate < startDate;
  const hasChanges = startDate !== booking.startDate || endDate !== booking.endDate;

  const days = invalidRange
    ? 0
    : Math.round((fromISODate(endDate).getTime() - fromISODate(startDate).getTime()) / 86_400_000) + 1;
  const cost = person ? days * person.dailyRate : 0;

  return (
    <div className="pdc-popover card elev-lg" style={{ left: x, top: y }}>
      <div className="pdc-detail-title">{person?.name ?? 'Ressource inconnue'}</div>
      <div className="pdc-detail-row">
        <span className="text-muted">Sur</span>
        <span>{project ? project.name : ABSENCE_LABELS[booking.absenceType!]}</span>
      </div>

      <div className="field">
        <label htmlFor="detail-start-date">Période</label>
        <div className="pdc-date-range">
          <input
            id="detail-start-date"
            type="date"
            className="input"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-muted">→</span>
          <input
            type="date"
            className="input"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {project && !invalidRange && (
        <div className="pdc-detail-row">
          <span className="text-muted">Coût</span>
          <span>
            {days} j · {cost.toLocaleString('fr-FR')} €
          </span>
        </div>
      )}

      {hasChanges && !invalidRange && (
        <button type="button" className="btn btn-primary btn-block" onClick={() => onSaveDates(startDate, endDate)}>
          Enregistrer les nouvelles dates
        </button>
      )}
      <button type="button" className="btn btn-secondary btn-block" onClick={onRelease}>
        Libérer
      </button>
    </div>
  );
}
