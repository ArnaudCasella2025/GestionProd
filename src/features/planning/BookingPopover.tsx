import { ABSENCE_LABELS, type AbsenceType, type Project } from '../../types';
import { usePopoverPosition } from './usePopoverPosition';

interface BookingPopoverProps {
  x: number;
  y: number;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onSelectAbsence: (type: AbsenceType) => void;
}

const ABSENCE_TYPES: AbsenceType[] = ['conge', 'rtt', 'teletravail', 'maladie'];

export function BookingPopover({ x, y, projects, onSelectProject, onSelectAbsence }: BookingPopoverProps) {
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
    </div>
  );
}
