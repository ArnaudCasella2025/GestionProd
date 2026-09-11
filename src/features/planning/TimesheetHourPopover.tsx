import { ABSENCE_LABELS, type AbsenceType, type Project } from '../../types';
import { usePopoverPosition } from './usePopoverPosition';

interface TimesheetHourPopoverProps {
  x: number;
  y: number;
  projects: Project[];
  hasValue: boolean;
  onSelectProject: (projectId: string) => void;
  onSelectAbsence: (type: AbsenceType) => void;
  onClear: () => void;
}

const ABSENCE_TYPES: AbsenceType[] = ['conge', 'teletravail', 'maladie'];

export function TimesheetHourPopover({
  x,
  y,
  projects,
  hasValue,
  onSelectProject,
  onSelectAbsence,
  onClear,
}: TimesheetHourPopoverProps) {
  const { ref, style } = usePopoverPosition(x, y);

  return (
    <div ref={ref} className="pdc-popover card elev-lg" style={style}>
      <div className="pdc-popover-kicker">Projets</div>
      {projects.map((project) => (
        <button key={project.id} type="button" className="pdc-popover-option" onClick={() => onSelectProject(project.id)}>
          <span className="pdc-color-dot" style={{ background: project.color }} />
          {project.name}
        </button>
      ))}
      <div className="pdc-popover-kicker">Absence</div>
      {ABSENCE_TYPES.map((type) => (
        <button key={type} type="button" className="pdc-popover-option" onClick={() => onSelectAbsence(type)}>
          <span className="pdc-color-dot pdc-color-dot-hatch" />
          {ABSENCE_LABELS[type]}
        </button>
      ))}
      {hasValue && (
        <button type="button" className="pdc-popover-option" style={{ color: 'var(--color-accent-2-700)' }} onClick={onClear}>
          Effacer cette heure
        </button>
      )}
    </div>
  );
}
