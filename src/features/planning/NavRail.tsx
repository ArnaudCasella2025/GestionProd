import type { Project } from '../../types';

interface NavRailProps {
  projects: Project[];
  pendingRequestCount: number;
  onOpenRequests: () => void;
}

const SECTIONS = [
  { label: 'Plan de charge', active: true },
  { label: 'Semainier', active: false },
  { label: 'Timesheets', active: false },
  { label: 'Projets', active: false },
  { label: 'Équipe', active: false },
];

export function NavRail({ projects, pendingRequestCount, onOpenRequests }: NavRailProps) {
  return (
    <nav className="pdc-rail">
      <div className="nav-brand" style={{ padding: '0 var(--space-2)' }}>
        GestionProd
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={onOpenRequests} style={{ position: 'relative' }}>
        Demandes
        {pendingRequestCount > 0 && <span className="pdc-badge">{pendingRequestCount}</span>}
      </button>

      <ul className="pdc-rail-sections">
        {SECTIONS.map((section) => (
          <li key={section.label}>
            <a href="#" aria-current={section.active ? 'page' : undefined} onClick={(e) => e.preventDefault()}>
              {section.label}
              {!section.active && <span className="pdc-soon">bientôt</span>}
            </a>
          </li>
        ))}
      </ul>

      <div className="pdc-rail-legend">
        <h6>Projets</h6>
        {projects.map((project) => (
          <div key={project.id} className="pdc-legend-row">
            <span className="pdc-color-dot" style={{ background: project.color }} />
            {project.name}
          </div>
        ))}
      </div>
    </nav>
  );
}
