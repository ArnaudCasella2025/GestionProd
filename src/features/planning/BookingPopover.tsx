import { useState } from 'react';
import { ABSENCE_LABELS, type AbsenceType, type DayHalf, type Project } from '../../types';
import { usePopoverPosition } from './usePopoverPosition';
import { countWeekdays } from './autoSchedule';
import type { TimeUnit } from './timeUnits';

interface BookingPopoverProps {
  x: number;
  y: number;
  projects: Project[];
  units: TimeUnit[];
  /** The selected [startCol, endCol] range, as grid column indices into `units`. */
  cols: [number, number];
  /** `targetDays` is null to book every day of the selected range (the
   * default), or a number lower than the range's weekday count to instead
   * spread that many days across it (same engine as Plan de production's
   * "Planifier des jours"). */
  onSelectProject: (projectId: string, startHalf: DayHalf, endHalf: DayHalf, targetDays: number | null) => void;
  onSelectAbsence: (type: AbsenceType, startHalf: DayHalf, endHalf: DayHalf, targetDays: number | null) => void;
}

const ABSENCE_TYPES: AbsenceType[] = ['conge', 'rtt', 'teletravail', 'maladie'];

export function BookingPopover({ x, y, projects, units, cols, onSelectProject, onSelectAbsence }: BookingPopoverProps) {
  const { ref, style } = usePopoverPosition(x, y);
  const [startHalf, setStartHalf] = useState<DayHalf>('AM');
  const [endHalf, setEndHalf] = useState<DayHalf>('PM');

  const [colStart, colEnd] = cols;
  const isSingleDay = colStart === colEnd;
  // A column only represents a single calendar day at day-granularity zooms
  // ('semaine'/'mois') — at 'année', each column is a whole week, so a
  // half-day split isn't meaningful there and the picker stays hidden
  // (booking defaults to full days, same as before this feature existed).
  const supportsHalfDay = units[colStart]?.startIso === units[colStart]?.endIso;

  const rangeStart = units[colStart]?.startIso;
  const rangeEnd = units[colEnd]?.endIso;
  const fullCount = rangeStart && rangeEnd ? countWeekdays(rangeStart, rangeEnd) : 0;
  const [targetDaysInput, setTargetDaysInput] = useState(() => String(fullCount));
  const targetDaysNumber = Number(targetDaysInput);
  // A selection spanning several weeks (frequent at 'année' zoom, where one
  // column is a whole week) defaults to booking every weekday in it — but
  // reducing the number below that switches to spreading just that many
  // days across the range instead, rather than always staffing it solid.
  const isDistributeMode = !isSingleDay && Number.isFinite(targetDaysNumber) && targetDaysNumber > 0 && targetDaysNumber < fullCount;

  return (
    <div ref={ref} className="pdc-popover card elev-lg" style={style}>
      {!isSingleDay && (
        <div className="field" style={{ marginBottom: 'var(--space-2)' }}>
          <label htmlFor="popover-target-days">Nombre de jours à réserver</label>
          <input
            id="popover-target-days"
            type="number"
            className="input"
            min={1}
            max={fullCount}
            step={1}
            value={targetDaysInput}
            onChange={(e) => setTargetDaysInput(e.target.value)}
          />
          <p className="text-muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
            {isDistributeMode
              ? `Réparti automatiquement sur les jours disponibles de la période.`
              : `Réserve tous les jours ouvrés de la période (${fullCount}). Réduisez ce nombre pour en répartir moins.`}
          </p>
        </div>
      )}

      {supportsHalfDay &&
        !isDistributeMode &&
        (isSingleDay ? (
          <div className="seg">
            <label className="seg-opt">
              <input
                type="radio"
                name="popover-daymode"
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
                name="popover-daymode"
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
                name="popover-daymode"
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
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Premier jour</label>
              <div className="seg">
                <label className="seg-opt">
                  <input type="radio" name="popover-start-half" checked={startHalf === 'AM'} onChange={() => setStartHalf('AM')} />
                  Journée complète
                </label>
                <label className="seg-opt">
                  <input type="radio" name="popover-start-half" checked={startHalf === 'PM'} onChange={() => setStartHalf('PM')} />
                  Après-midi seulement
                </label>
              </div>
            </div>
            <div className="field">
              <label>Dernier jour</label>
              <div className="seg">
                <label className="seg-opt">
                  <input type="radio" name="popover-end-half" checked={endHalf === 'PM'} onChange={() => setEndHalf('PM')} />
                  Journée complète
                </label>
                <label className="seg-opt">
                  <input type="radio" name="popover-end-half" checked={endHalf === 'AM'} onChange={() => setEndHalf('AM')} />
                  Matin seulement
                </label>
              </div>
            </div>
          </>
        ))}

      <div className="pdc-popover-kicker">Projets</div>
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          className="pdc-popover-option"
          onClick={() => onSelectProject(project.id, startHalf, endHalf, isDistributeMode ? targetDaysNumber : null)}
        >
          <span className="pdc-color-dot" style={{ background: project.color }} />
          {project.name}
        </button>
      ))}
      <div className="pdc-popover-kicker">Absence</div>
      {ABSENCE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className="pdc-popover-option"
          onClick={() => onSelectAbsence(type, startHalf, endHalf, isDistributeMode ? targetDaysNumber : null)}
        >
          <span className="pdc-color-dot pdc-color-dot-hatch" />
          {ABSENCE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
