import { logout, useAuthUser } from '../../lib/auth';
import { useTestRole } from '../../lib/testRole';
import { ACCESS_LEVEL_LABELS, type AccessLevel, type Project } from '../../types';

export type PlanningView =
  | 'charge'
  | 'production'
  | 'semainier'
  | 'timesheets'
  | 'affectation'
  | 'absences'
  | 'projets'
  | 'equipe';

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
  { label: 'Mes absences', view: 'absences' },
  { label: 'Projets', view: 'projets' },
  { label: 'Équipe', view: 'equipe' },
];

const ACCESS_LEVELS: AccessLevel[] = ['admin', 'responsable', 'user'];

export function NavRail({ projects, pendingRequestCount, onOpenRequests, activeView, onNavigate }: NavRailProps) {
  const { user } = useAuthUser();
  const { role, setRole } = useTestRole();

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

      <div className="pdc-rail-account">
        <div className="pdc-rail-account-email" title={user?.email ?? undefined}>
          {user?.displayName || user?.email}
        </div>
        <div>
          <label className="pdc-rail-testrole-label" htmlFor="test-role-select">
            Rôle de test
          </label>
          <select
            id="test-role-select"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as AccessLevel)}
          >
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACCESS_LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => logout().catch(console.error)}>
          Se déconnecter
        </button>
      </div>
    </nav>
  );
}
