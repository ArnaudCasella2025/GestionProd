import { useState } from 'react';
import type { SalaryRecord } from '../../types';
import { socialChargesMonthKey, socialChargesPercentOn } from './salaryCalc';

interface SocialChargesModalProps {
  chargesByMonth: Record<string, number>;
  salaryHistory: SalaryRecord[];
  onSave: (chargesByMonth: Record<string, number>) => void;
  onClose: () => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LABELS = MONTHS.map((m) => new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' }));

export function SocialChargesModal({ chargesByMonth, salaryHistory, onSave, onClose }: SocialChargesModalProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [draft, setDraft] = useState<Record<string, number>>(chargesByMonth);

  function setMonthValue(month: number, raw: string) {
    const key = socialChargesMonthKey(year, month);
    const trimmed = raw.trim();
    setDraft((prev) => {
      const next = { ...prev };
      if (trimmed === '') {
        delete next[key];
        return next;
      }
      const num = Number(trimmed);
      if (Number.isNaN(num)) return prev;
      next[key] = num;
      return next;
    });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(440px, 100%)' }}>
        <div className="dialog-title">Charges sociales</div>
        <p className="text-muted" style={{ marginTop: 0, fontSize: 13 }}>
          Taux de charges patronales par mois. Un mois laissé vide reprend le dernier taux connu (indiqué en filigrane).
        </p>

        <div className="pdc-time-nav" style={{ marginBottom: 'var(--space-3)' }}>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setYear((y) => y - 1)} aria-label="Année précédente">
            ‹
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setYear(new Date().getFullYear())}>
            Aujourd'hui
          </button>
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setYear((y) => y + 1)} aria-label="Année suivante">
            ›
          </button>
          <span className="pdc-anchor-label">{year}</span>
        </div>

        <div className="scm-grid">
          {MONTHS.map((month, i) => {
            const key = socialChargesMonthKey(year, month);
            const inherited = socialChargesPercentOn(draft, salaryHistory, `${key}-01`);
            return (
              <div className="field" key={month} style={{ marginBottom: 0 }}>
                <label htmlFor={`scm-month-${month}`} style={{ textTransform: 'capitalize' }}>
                  {MONTH_LABELS[i]}
                </label>
                <input
                  id={`scm-month-${month}`}
                  className="input"
                  type="number"
                  min={0}
                  step={0.1}
                  value={draft[key] ?? ''}
                  placeholder={String(inherited)}
                  onChange={(e) => setMonthValue(month, e.target.value)}
                />
              </div>
            );
          })}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(draft)}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
