import { useState } from 'react';
import { createPerson, deletePerson, updatePerson } from '../../lib/repository';
import { ACCESS_LEVEL_LABELS, type Person } from '../../types';
import { TeamMemberModal } from './TeamMemberModal';

interface EquipeProps {
  people: Person[];
}

type ModalState = { mode: 'create' } | { mode: 'edit'; person: Person } | null;

const ACCESS_TAG_CLASS: Record<string, string> = {
  admin: 'tag-accent-2',
  responsable: 'tag-accent',
  user: 'tag-neutral',
};

export function Equipe({ people }: EquipeProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Équipe</h1>
        <p className="text-muted">
          Ajoutez, modifiez ou retirez des membres de l'équipe. Réservé à l'administration — voir le README
          concernant les droits d'accès, pas encore appliqués côté serveur.
        </p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

      <div className="pdc-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
          Ajouter un membre
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted">Aucun membre pour l'instant.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Poste</th>
              <th>TJM</th>
              <th>Droits</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((person) => {
              const accessLevel = person.accessLevel ?? 'user';
              return (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.role}</td>
                  <td>{person.dailyRate.toLocaleString('fr-FR')} €/j</td>
                  <td>
                    <span className={`tag ${ACCESS_TAG_CLASS[accessLevel]}`}>{ACCESS_LEVEL_LABELS[accessLevel]}</span>
                  </td>
                  <td>
                    {confirmDeleteId === person.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className="text-muted" style={{ alignSelf: 'center', fontSize: 13 }}>
                          Supprimer {person.name} ?
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            deletePerson(person.id).catch(console.error);
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
                        <button type="button" className="btn btn-secondary" onClick={() => setModal({ mode: 'edit', person })}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(person.id)}>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {modal && (
        <TeamMemberModal
          initial={modal.mode === 'edit' ? modal.person : undefined}
          onSave={(data) => {
            if (modal.mode === 'edit') updatePerson(modal.person.id, data).catch(console.error);
            else createPerson(data).catch(console.error);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
