import { useState } from 'react';
import { ABSENCE_LABELS, type AbsenceType, type DayHalf, type Project } from '../../types';
import { usePopoverPosition } from './usePopoverPosition';
import type { TimeUnit } from './timeUnits';

interface BookingPopoverProps {
  x: number;
  y: number;
  projects: Project[];
  units: TimeUnit[];
  /** The selected [startCol, endCol] range, as grid column indices into `units`. */
  cols: [number, number];
  onSelectProject: (projectId: string, startHalf: DayHalf, endHalf: DayHalf) => void;
  onSelectAbsence: (type: AbsenceType, startHalf: DayHalf, endHalf: DayHalf) => void;
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

  return (
    <div ref={ref} className="pdc-popover card elev-lg" style={style}>
      {supportsHalfDay &&
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
        <button key={project.id} type="button" className="pdc-popover-option" onClick={() => onSelectProject(project.id, startHalf, endHalf)}>
          <span className="pdc-color-dot" style={{ background: project.color }} />
          {project.name}
        </button>
      ))}
      <div className="pdc-popover-kicker">Absence</div>
      {ABSENCE_TYPES.map((type) => (
        <button key={type} type="button" className="pdc-popover-option" onClick={() => onSelectAbsence(type, startHalf, endHalf)}>
          <span className="pdc-color-dot pdc-color-dot-hatch" />
          {ABSENCE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
