import type { Project } from '../../types';

export type PlanningView = 'charge' | 'production' | 'semainier' | 'timesheets' | 'affectation' | 'projets' | 'equipe';

interface NavRailProps {
  projects: Project[];
  pendingRequestCount: number;
  onOpenRequests: () => void;
  activeView: PlanningView;
  onNavigate: (view: PlanningView) => void;
}

const SECTIONS: { label: string; view: PlanningView }[] = [
  { label: 'Plan de charge', view: 'charge' },
  { label: 'Plan de production', view: 'production' },
  { label: 'Semainier', view: 'semainier' },
  { label: 'Timesheets', view: 'timesheets' },
  { label: 'Affectation des permanents', view: 'affectation' },
  { label: 'Projets', view: 'projets' },
  { label: 'Équipe', view: 'equipe' },
];

export function NavRail({ projects, pendingRequestCount, onOpenRequests, activeView, onNavigate }: NavRailProps) {
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
          <li key={section.view}>
            <a
              href="#"
              aria-current={activeView === section.view ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(section.view);
              }}
            >
              {section.label}
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
