import { useMemo, useState } from 'react';
import type { Person, Project } from '../../types';

interface Destination {
  id: string;
  label: string;
  hint: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  people: Person[];
  projects: Project[];
  onGoToPerson: (personId: string) => void;
  onGoToProject: (projectId: string) => void;
  onClose: () => void;
}

export function CommandPalette({ people, projects, onGoToPerson, onGoToProject, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  const destinations: Destination[] = useMemo(
    () => [
      ...people.map((p) => ({
        id: `person-${p.id}`,
        label: p.name,
        hint: `Personne · ${p.role}`,
        onSelect: () => onGoToPerson(p.id),
      })),
      ...projects.map((p) => ({
        id: `project-${p.id}`,
        label: p.name,
        hint: `Projet · ${p.client}`,
        onSelect: () => onGoToProject(p.id),
      })),
    ],
    [people, projects, onGoToPerson, onGoToProject],
  );

  const filtered = destinations.filter((d) => d.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="dialog-backdrop" style={{ alignItems: 'flex-start', paddingTop: '10vh' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(480px, 100%)' }}>
        <input
          autoFocus
          className="input"
          placeholder="Aller à… (personne, projet)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="pdc-palette-list">
          {filtered.length === 0 && <div className="text-muted" style={{ padding: 'var(--space-2)' }}>Aucun résultat.</div>}
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              className="pdc-palette-option"
              onClick={() => {
                d.onSelect();
                onClose();
              }}
            >
              <span>{d.label}</span>
              <span className="text-muted">{d.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
