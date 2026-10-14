import { useState } from 'react';
import { addDays, formatDayLabel, formatFullDate, fromISODate, isWeekend, toISODate } from '../../lib/dates';
import type { Booking, DayHalf, Person, Project } from '../../types';
import { bookingLabel, coveredHalves } from './calc';
import { usePopoverPosition } from './usePopoverPosition';
import { useTestRole } from '../../lib/testRole';

interface DetailPanelProps {
  x: number;
  y: number;
  /** Every booking belonging to the clicked visual block — a single entry
   * for an ordinary booking, or several for a run of touching bars (e.g.
   * one day per week spread by "Nombre de jours à réserver") that reads as
   * one continuous block but is really several separate bookings. */
  bookings: Booking[];
  person: Person | undefined;
  project: Project | undefined;
  /** False for a Responsable viewing a booking on a project they don't
   * manage — the panel becomes read-only (no date/note edits, no release). */
  canManage: boolean;
  onRelease: () => void;
  onSaveDates: (startDate: string, endDate: string, startHalf: DayHalf, endHalf: DayHalf) => void;
  onSaveDayNote: (bookingId: string, date: string, note: string) => void;
}

/** Weekdays (Mon-Fri) in an inclusive date range — matches the calendar bar's
 * own weekend-skipping, since nobody annotates a day nobody is booked to work. */
function weekdaysInRange(startDate: string, endDate: string): string[] {
  if (endDate < startDate) return [];
  const days: string[] = [];
  for (let d = fromISODate(startDate); d <= fromISODate(endDate); d = addDays(d, 1)) {
    if (!isWeekend(d)) days.push(toISODate(d));
  }
  return days;
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

export function DetailPanel({ x, y, bookings, person, project, canManage, onRelease, onSaveDates, onSaveDayNote }: DetailPanelProps) {
  const { role } = useTestRole();
  const canSeeFinancials = role !== 'user';
  const { ref, style } = usePopoverPosition(x, y);
  const booking = bookings[0];
  const isGroup = bookings.length > 1;

  if (isGroup) {
    const sorted = [...bookings].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const dayToBookingId = new Map<string, string>();
    for (const b of sorted) {
      for (const iso of weekdaysInRange(b.startDate, b.endDate)) {
        if (!dayToBookingId.has(iso)) dayToBookingId.set(iso, b.id);
      }
    }
    const noteDays = Array.from(dayToBookingId.keys()).sort();
    const totalDays = sorted.reduce((sum, b) => sum + durationDays(b.startDate, b.endDate, b.startHalf ?? 'AM', b.endHalf ?? 'PM'), 0);
    const cost = person ? totalDays * person.dailyRate : 0;
    const firstDate = sorted[0].startDate;
    const lastDate = sorted[sorted.length - 1].endDate;

    return (
      <div ref={ref} className="pdc-popover card elev-lg" style={style}>
        <div className="pdc-detail-title">{person?.name ?? 'Ressource inconnue'}</div>
        <div className="pdc-detail-row">
          <span className="text-muted">Sur</span>
          <span>{bookingLabel(booking, project)}</span>
        </div>

        {!canManage && (
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            Lecture seule — vous n'êtes pas responsable de ce projet.
          </p>
        )}

        <div className="pdc-detail-row">
          <span className="text-muted">Période</span>
          <span>
            {totalDays.toLocaleString('fr-FR')} j du {formatFullDate(fromISODate(firstDate))} au {formatFullDate(fromISODate(lastDate))}
          </span>
        </div>

        {project && canSeeFinancials && (
          <div className="pdc-detail-row">
            <span className="text-muted">Coût</span>
            <span>
              {totalDays.toLocaleString('fr-FR')} j · {cost.toLocaleString('fr-FR')} €
            </span>
          </div>
        )}

        {noteDays.length > 0 && (
          <div className="field">
            <label>Notes par jour</label>
            <div className="pdc-daynotes">
              {noteDays.map((iso) => {
                const bookingId = dayToBookingId.get(iso)!;
                const owner = sorted.find((b) => b.id === bookingId);
                return (
                  <div className="pdc-daynote-row" key={iso}>
                    <span className="pdc-daynote-date">{formatDayLabel(fromISODate(iso))}</span>
                    <input
                      className="input"
                      placeholder="Annotation…"
                      defaultValue={owner?.dayNotes?.[iso] ?? ''}
                      disabled={!canManage}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== (owner?.dayNotes?.[iso] ?? '')) {
                          onSaveDayNote(bookingId, iso, e.target.value);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {canManage && (
          <button type="button" className="btn btn-secondary btn-block" onClick={onRelease}>
            Libérer les {sorted.length} jours
          </button>
        )}
      </div>
    );
  }

  return <SingleBookingDetail {...{ x, y, booking, person, project, canManage, onRelease, onSaveDates, onSaveDayNote }} />;
}

interface SingleBookingDetailProps {
  x: number;
  y: number;
  booking: Booking;
  person: Person | undefined;
  project: Project | undefined;
  canManage: boolean;
  onRelease: () => void;
  onSaveDates: (startDate: string, endDate: string, startHalf: DayHalf, endHalf: DayHalf) => void;
  onSaveDayNote: (bookingId: string, date: string, note: string) => void;
}

function SingleBookingDetail({ x, y, booking, person, project, canManage, onRelease, onSaveDates, onSaveDayNote }: SingleBookingDetailProps) {
  const { role } = useTestRole();
  const canSeeFinancials = role !== 'user';
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

      {!canManage && (
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
          Lecture seule — vous n'êtes pas responsable de ce projet.
        </p>
      )}

      <div className="field">
        <label htmlFor="detail-start-date">Période</label>
        <div className="pdc-date-range">
          <input
            id="detail-start-date"
            type="date"
            className="input"
            value={startDate}
            max={endDate}
            disabled={!canManage}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-muted">→</span>
          <input
            type="date"
            className="input"
            value={endDate}
            min={startDate}
            disabled={!canManage}
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
                disabled={!canManage}
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
                disabled={!canManage}
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
                disabled={!canManage}
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
                  <input type="radio" name="detail-start-half" disabled={!canManage} checked={startHalf === 'AM'} onChange={() => setStartHalf('AM')} />
                  Journée complète
                </label>
                <label className="seg-opt">
                  <input type="radio" name="detail-start-half" disabled={!canManage} checked={startHalf === 'PM'} onChange={() => setStartHalf('PM')} />
                  Après-midi seulement
                </label>
              </div>
            </div>
            <div className="field">
              <label>Dernier jour</label>
              <div className="seg">
                <label className="seg-opt">
                  <input type="radio" name="detail-end-half" disabled={!canManage} checked={endHalf === 'PM'} onChange={() => setEndHalf('PM')} />
                  Journée complète
                </label>
                <label className="seg-opt">
                  <input type="radio" name="detail-end-half" disabled={!canManage} checked={endHalf === 'AM'} onChange={() => setEndHalf('AM')} />
                  Matin seulement
                </label>
              </div>
            </div>
          </>
        ))}

      {project && !invalidRange && canSeeFinancials && (
        <div className="pdc-detail-row">
          <span className="text-muted">Coût</span>
          <span>
            {days.toLocaleString('fr-FR')} j · {cost.toLocaleString('fr-FR')} €
          </span>
        </div>
      )}

      {(() => {
        const noteDays = weekdaysInRange(booking.startDate, booking.endDate);
        if (noteDays.length === 0) return null;
        return (
          <div className="field">
            <label>Notes par jour</label>
            <div className="pdc-daynotes">
              {noteDays.map((iso) => (
                <div className="pdc-daynote-row" key={iso}>
                  <span className="pdc-daynote-date">{formatDayLabel(fromISODate(iso))}</span>
                  <input
                    className="input"
                    placeholder="Annotation…"
                    defaultValue={booking.dayNotes?.[iso] ?? ''}
                    disabled={!canManage}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (booking.dayNotes?.[iso] ?? '')) {
                        onSaveDayNote(booking.id, iso, e.target.value);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {canManage && hasChanges && !invalidRange && (
        <button type="button" className="btn btn-primary btn-block" onClick={() => onSaveDates(startDate, endDate, startHalf, endHalf)}>
          Enregistrer les nouvelles dates
        </button>
      )}
      {canManage && (
        <button type="button" className="btn btn-secondary btn-block" onClick={onRelease}>
          Libérer
        </button>
      )}
    </div>
  );
}
