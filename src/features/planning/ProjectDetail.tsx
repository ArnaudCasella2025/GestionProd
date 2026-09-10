import type { Booking, Person, Project } from '../../types';
import { PROJECT_STATUS_LABEL, computeProjectBudget, peopleForProject, projectDateRange } from './calc';
import { formatFullDate, fromISODate } from '../../lib/dates';

interface ProjectDetailProps {
  project: Project;
  bookings: Booking[];
  people: Person[];
  onBack: () => void;
  onEdit: () => void;
}

const STATUS_TAG_CLASS: Record<string, string> = {
  sous_controle: 'tag-accent',
  tendu: 'tag-neutral',
  depassement: 'tag-accent-2',
};

export function ProjectDetail({ project, bookings, people, onBack, onEdit }: ProjectDetailProps) {
  const { consumed, projected, status, ratio } = computeProjectBudget(project, bookings, people);
  const consumedPct = project.budget > 0 ? Math.min((consumed / project.budget) * 100, 100) : 0;
  const projectedPct = project.budget > 0 ? Math.min((projected / project.budget) * 100, 100) : 0;
  const assignedPeople = peopleForProject(bookings, people, project.id);
  const range = projectDateRange(bookings, project.id);

  return (
    <main className="pdc-main">
      <button type="button" className="btn btn-ghost" onClick={onBack} style={{ width: 'fit-content' }}>
        ‹ Retour aux projets
      </button>

      <header className="pdc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pdc-color-dot" style={{ background: project.color, width: 16, height: 16 }} />
          <h1>{project.name}</h1>
        </div>
        <p className="text-muted">{project.client || 'Financeur non renseigné'}</p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

      {project.description && <p>{project.description}</p>}

      <section>
        <h3>Budget</h3>
        <span className={`tag ${STATUS_TAG_CLASS[status]}`} style={{ width: 'fit-content' }}>
          {PROJECT_STATUS_LABEL[status]}
        </span>
        <div className="pdc-progress" style={{ marginTop: 'var(--space-2)' }}>
          <div className="pdc-progress-track">
            <div className="pdc-progress-projected" style={{ width: `${projectedPct}%` }} />
            <div className="pdc-progress-real" style={{ width: `${consumedPct}%` }} />
          </div>
        </div>
        <div className="card-meta" style={{ marginTop: 'var(--space-1)' }}>
          <span>
            {(consumed / 1000).toFixed(1)} k€ réel · {(projected / 1000).toFixed(1)} k€ projeté
          </span>
          <span>/ {(project.budget / 1000).toFixed(0)} k€ budget</span>
        </div>
        {ratio > 1 && <div className="pdc-overrun">Dépassement de {Math.round((ratio - 1) * 100)} %</div>}
      </section>

      <section>
        <h3>Ressources affectées</h3>
        {range && (
          <p className="text-muted">
            Du {formatFullDate(fromISODate(range.start))} au {formatFullDate(fromISODate(range.end))}
          </p>
        )}
        {assignedPeople.length === 0 ? (
          <p className="text-muted">Aucune ressource affectée pour l'instant.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Poste</th>
                <th>TJM</th>
              </tr>
            </thead>
            <tbody>
              {assignedPeople.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.role}</td>
                  <td>{person.dailyRate.toLocaleString('fr-FR')} €/j</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div>
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Modifier le projet
        </button>
      </div>
    </main>
  );
}
