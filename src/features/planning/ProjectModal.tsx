import { useState, type FormEvent } from 'react';
import type { Project } from '../../types';

interface ProjectModalProps {
  /** Present when editing an existing project; absent when creating a new one. */
  initial?: Project;
  onSave: (data: { name: string; client: string; color: string; budget: number; description: string }) => void;
  onClose: () => void;
}

export function ProjectModal({ initial, onSave, onClose }: ProjectModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [client, setClient] = useState(initial?.client ?? '');
  const [color, setColor] = useState(initial?.color ?? '#0088b0');
  const [budget, setBudget] = useState(String(initial?.budget ?? ''));
  const [description, setDescription] = useState(initial?.description ?? '');

  const budgetNumber = Number(budget);
  const isValid = name.trim().length > 0 && budget.trim().length > 0 && Number.isFinite(budgetNumber) && budgetNumber > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({ name: name.trim(), client: client.trim(), color, budget: budgetNumber, description: description.trim() });
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" style={{ width: 'min(480px, 100%)' }} onSubmit={handleSubmit}>
        <div className="dialog-title">{initial ? 'Modifier le projet' : 'Ajouter un projet'}</div>

        <div className="field">
          <label htmlFor="project-name">Nom</label>
          <input id="project-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </div>

        <div className="field">
          <label htmlFor="project-client">Financeur</label>
          <input id="project-client" className="input" value={client} onChange={(e) => setClient(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="project-description">Description</label>
          <textarea
            id="project-description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="project-budget">Budget total</label>
            <input
              id="project-budget"
              className="input"
              type="number"
              min={0}
              step={1000}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="project-color">Couleur</label>
            <input
              id="project-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 48, height: 36, padding: 2, border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isValid}>
            {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
