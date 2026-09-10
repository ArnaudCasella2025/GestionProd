import { useState } from 'react';
import { addDays, fromISODate, toISODate } from '../../lib/dates';
import type { Booking, DayHalf, Person, Project } from '../../types';
import { bookingLabel, coveredHalves } from './calc';
import { usePopoverPosition } from './usePopoverPosition';

interface DetailPanelProps {
  x: number;
  y: number;
  booking: Booking;
  person: Person | undefined;
  project: Project | undefined;
  onRelease: () => void;
  onSaveDates: (startDate: string, endDate: string, startHalf: DayHalf, endHalf: DayHalf) => void;
}

function durationDays(startDate: string, endDate: string, startHalf: DayHalf, endHalf: DayHalf): number {
  if (endDate < startDate) return 0;
  const probe: Booking = { id: '', personId: '', startDate, endDate, startHalf, endHalf };
  let total = 0;
  for (let d = fromISODate(startDate); d <= fromISODate(endDate); d = addDays(d, 1)) {
    total += coveredHalves(probe, toISODate(d)).length * 0.5;
  }
  return total;
}

export function DetailPanel({ x, y, booking, person, project, onRelease, onSaveDates }: DetailPanelProps) {
  const [startDate, setStartDate] = useState(booking.startDate);
  const [endDate, setEndDate] = useState(booking.endDate);
  const [startHalf, setStartHalf] = useState<DayHalf>(booking.startHalf ?? 'AM');
  const [endHalf, setEndHalf] = useState<DayHalf>(booking.endHalf ?? 'PM');

  const invalidRange = endDate < startDate;
  const sameDay = startDate === endDate;
  const hasChanges =
    startDate !== booking.startDate ||
    endDate !== booking.endDate ||
    startHalf !== (booking.startHalf ?? 'AM') ||
    endHalf !== (booking.endHalf ?? 'PM');

  const days = invalidRange ? 0 : durationDays(startDate, endDate, startHalf, endHalf);
  const cost = person ? days * person.dailyRate : 0;

  const { ref, style } = usePopoverPosition(x, y);

  return (
    <div ref={ref} className="pdc-popover card elev-lg" style={style}>
      <div className="pdc-detail-title">{person?.name ?? 'Ressource inconnue'}</div>
      <div className="pdc-detail-row">
        <span className="text-muted">Sur</span>
        <span>{bookingLabel(booking, project)}</span>
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

      {!invalidRange &&
        (sameDay ? (
          <div className="seg">
            <label className="seg-opt">
              <input
                type="radio"
                name="detail-daymode"
                checked={startHalf === 'AM' && endHalf === 'PM'}
                onChange={() => {
                  setStartHalf('AM');
                  setEndHalf('PM');
                }}
              />
              Journée
            </label>
            <label className="seg-opt">
              <input
                type="radio"
                name="detail-daymode"
                checked={startHalf === 'AM' && endHalf === 'AM'}
                onChange={() => {
                  setStartHalf('AM');
                  setEndHalf('AM');
                }}
              />
              Matin
            </label>
            <label className="seg-opt">
              <input
                type="radio"
                name="detail-daymode"
                checked={startHalf === 'PM' && endHalf === 'PM'}
                onChange={() => {
                  setStartHalf('PM');
                  setEndHalf('PM');
                }}
              />
              Après-midi
            </label>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Premier jour</label>
              <div className="seg">
                <label className="seg-opt">
                  <input type="radio" name="detail-start-half" checked={startHalf === 'AM'} onChange={() => setStartHalf('AM')} />
                  Journée complète
                </label>
                <label className="seg-opt">
                  <input type="radio" name="detail-start-half" checked={startHalf === 'PM'} onChange={() => setStartHalf('PM')} />
                  Après-midi seulement
                </label>
              </div>
            </div>
            <div className="field">
              <label>Dernier jour</label>
              <div className="seg">
                <label className="seg-opt">
                  <input type="radio" name="detail-end-half" checked={endHalf === 'PM'} onChange={() => setEndHalf('PM')} />
                  Journée complète
                </label>
                <label className="seg-opt">
                  <input type="radio" name="detail-end-half" checked={endHalf === 'AM'} onChange={() => setEndHalf('AM')} />
                  Matin seulement
                </label>
              </div>
            </div>
          </>
        ))}

      {project && !invalidRange && (
        <div className="pdc-detail-row">
          <span className="text-muted">Coût</span>
          <span>
            {days.toLocaleString('fr-FR')} j · {cost.toLocaleString('fr-FR')} €
          </span>
        </div>
      )}

      {hasChanges && !invalidRange && (
        <button type="button" className="btn btn-primary btn-block" onClick={() => onSaveDates(startDate, endDate, startHalf, endHalf)}>
          Enregistrer les nouvelles dates
        </button>
      )}
      <button type="button" className="btn btn-secondary btn-block" onClick={onRelease}>
        Libérer
      </button>
    </div>
  );
}
