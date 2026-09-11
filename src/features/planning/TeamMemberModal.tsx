import { useState, type FormEvent } from 'react';
import {
  ACCESS_LEVEL_LABELS,
  DEFAULT_CONGES_PER_YEAR,
  DEFAULT_RTT_PER_YEAR,
  JOB_TITLES,
  type AccessLevel,
  type Person,
} from '../../types';

interface TeamMemberModalProps {
  /** Present when editing an existing member; absent when creating a new one. */
  initial?: Person;
  onSave: (data: {
    name: string;
    role: string;
    dailyRate: number;
    accessLevel: AccessLevel;
    congesPerYear: number;
    rttPerYear: number;
  }) => void;
  onClose: () => void;
}

const ACCESS_LEVELS: AccessLevel[] = ['admin', 'responsable', 'user'];

export function TeamMemberModal({ initial, onSave, onClose }: TeamMemberModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? JOB_TITLES[0]);
  const [dailyRate, setDailyRate] = useState(String(initial?.dailyRate ?? ''));
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(initial?.accessLevel ?? 'user');
  const [congesPerYear, setCongesPerYear] = useState(String(initial?.congesPerYear ?? DEFAULT_CONGES_PER_YEAR));
  const [rttPerYear, setRttPerYear] = useState(String(initial?.rttPerYear ?? DEFAULT_RTT_PER_YEAR));

  const rateNumber = Number(dailyRate);
  const congesNumber = Number(congesPerYear);
  const rttNumber = Number(rttPerYear);
  const isValid =
    name.trim().length > 0 &&
    dailyRate.trim().length > 0 &&
    Number.isFinite(rateNumber) &&
    rateNumber > 0 &&
    Number.isFinite(congesNumber) &&
    congesNumber >= 0 &&
    Number.isFinite(rttNumber) &&
    rttNumber >= 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({ name: name.trim(), role, dailyRate: rateNumber, accessLevel, congesPerYear: congesNumber, rttPerYear: rttNumber });
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" style={{ width: 'min(440px, 100%)' }} onSubmit={handleSubmit}>
        <div className="dialog-title">{initial ? 'Modifier le membre' : 'Ajouter un membre'}</div>

        <div className="field">
          <label htmlFor="team-name">Nom</label>
          <input id="team-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </div>

        <div className="field">
          <label htmlFor="team-role">Poste</label>
          <select id="team-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {JOB_TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="team-rate">Taux journalier moyen (TJM)</label>
          <input
            id="team-rate"
            className="input"
            type="number"
            min={0}
            step={1}
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="team-conges">Congés (j/an)</label>
            <input
              id="team-conges"
              className="input"
              type="number"
              min={0}
              step={1}
              value={congesPerYear}
              onChange={(e) => setCongesPerYear(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="team-rtt">RTT (j/an)</label>
            <input
              id="team-rtt"
              className="input"
              type="number"
              min={0}
              step={1}
              value={rttPerYear}
              onChange={(e) => setRttPerYear(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="team-access">Droits</label>
          <select id="team-access" className="input" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}>
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACCESS_LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
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
