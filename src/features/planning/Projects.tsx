import { useState } from 'react';
import { createProject, deleteProject, updateProject } from '../../lib/repository';
import { useTestRole } from '../../lib/testRole';
import type { Booking, Person, Project } from '../../types';
import { ProjectDetail } from './ProjectDetail';
import { ProjectModal } from './ProjectModal';

interface ProjectsProps {
  projects: Project[];
  bookings: Booking[];
  people: Person[];
}

type ModalState = { mode: 'create' } | { mode: 'edit'; project: Project } | null;

export function Projects({ projects, bookings, people }: ProjectsProps) {
  const { role } = useTestRole();
  const canSeeFinancials = role !== 'user';
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        bookings={bookings}
        people={people}
        onBack={() => setSelectedProjectId(null)}
        onEdit={() => setModal({ mode: 'edit', project: selectedProject })}
      />
    );
  }

  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Projets</h1>
        <p className="text-muted">
          {canSeeFinancials
            ? 'Ajoutez, modifiez ou retirez des projets.'
            : "Consultation seule — l'ajout, la modification et la suppression sont réservés à l'administration."}
        </p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

      {canSeeFinancials && (
        <div className="pdc-toolbar">
          <button type="button" className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
            Ajouter un projet
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-muted">Aucun projet pour l'instant.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Financeur</th>
              {canSeeFinancials && <th>Budget</th>}
              {canSeeFinancials && <th />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((project) => (
              <tr key={project.id}>
                <td>
                  <button
                    type="button"
                    className="pdc-popover-option"
                    style={{ padding: 0, display: 'inline-flex' }}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <span className="pdc-color-dot" style={{ background: project.color }} />
                    {project.name}
                  </button>
                </td>
                <td>{project.client || '—'}</td>
                {canSeeFinancials && <td>{(project.budget / 1000).toFixed(0)} k€</td>}
                {canSeeFinancials && (
                  <td>
                    {confirmDeleteId === project.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className="text-muted" style={{ alignSelf: 'center', fontSize: 13 }}>
                          Supprimer {project.name} ?
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            deleteProject(project.id).catch(console.error);
                            setConfirmDeleteId(null);
                          }}
                        >
                          Confirmer
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setModal({ mode: 'edit', project })}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(project.id)}>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && canSeeFinancials && (
        <ProjectModal
          initial={modal.mode === 'edit' ? modal.project : undefined}
          onSave={(data) => {
            if (modal.mode === 'edit') updateProject(modal.project.id, data).catch(console.error);
            else createProject(data).catch(console.error);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
