import { PROJECT_STATUS_LABEL, computeProjectBudget } from './calc';
import type { Booking, Person, Project } from '../../types';

interface ProjectCardsProps {
  projects: Project[];
  bookings: Booking[];
  people: Person[];
}

const STATUS_TAG_CLASS: Record<string, string> = {
  sous_controle: 'tag-accent',
  tendu: 'tag-neutral',
  depassement: 'tag-accent-2',
};

export function ProjectCards({ projects, bookings, people }: ProjectCardsProps) {
  return (
    <section className="pdc-projects">
      <h3>Consommé & projeté</h3>
      <div className="pdc-project-grid">
        {projects.map((project) => {
          const { consumed, projected, status, ratio } = computeProjectBudget(project, bookings, people);
          const consumedPct = Math.min((consumed / project.budget) * 100, 100);
          const projectedPct = Math.min((projected / project.budget) * 100, 100);

          return (
            <div className="card pdc-project-card" key={project.id} id={`project-card-${project.id}`}>
              <div className="card-kicker">{project.client}</div>
              <div className="card-title">{project.name}</div>
              <span className={`tag ${STATUS_TAG_CLASS[status]}`} style={{ width: 'fit-content' }}>
                {PROJECT_STATUS_LABEL[status]}
              </span>
              <div className="pdc-progress">
                <div className="pdc-progress-track">
                  <div className="pdc-progress-projected" style={{ width: `${projectedPct}%` }} />
                  <div className="pdc-progress-real" style={{ width: `${consumedPct}%` }} />
                </div>
              </div>
              <div className="card-meta">
                <span>
                  {(consumed / 1000).toFixed(1)} k€ réel · {(projected / 1000).toFixed(1)} k€ projeté
                </span>
                <span>/ {(project.budget / 1000).toFixed(0)} k€</span>
              </div>
              {ratio > 1 && <div className="pdc-overrun">Dépassement de {Math.round((ratio - 1) * 100)} %</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
