import { useState, type FormEvent } from 'react';
import { formatFullDate, fromISODate, toISODate } from '../../lib/dates';
import {
  ACCESS_LEVEL_LABELS,
  DEFAULT_CONGES_PER_YEAR,
  DEFAULT_RTT_PER_YEAR,
  JOB_TITLES,
  type AccessLevel,
  type Person,
  type SalaryRecord,
} from '../../types';
import { chargeAmount, dailyRateFor, dailyRateOn, recordEffectiveOn } from './salaryCalc';

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
    salaryHistory: SalaryRecord[];
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
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>(initial?.salaryHistory ?? []);

  const [recordDate, setRecordDate] = useState('');
  const [recordGross, setRecordGross] = useState('');
  const [recordCharges, setRecordCharges] = useState('');

  const todayIso = toISODate(new Date());
  const hasSalaryHistory = salaryHistory.length > 0;
  // Falls back to the person's last known rate if every salary record is dated
  // in the future (nothing is effective yet as of today).
  const computedRate = hasSalaryHistory ? dailyRateOn(salaryHistory, todayIso, initial?.dailyRate ?? 0) : null;
  const hasEffectiveRecord = hasSalaryHistory && recordEffectiveOn(salaryHistory, todayIso) != null;

  const rateNumber = computedRate ?? Number(dailyRate);
  const congesNumber = Number(congesPerYear);
  const rttNumber = Number(rttPerYear);
  const isValid =
    name.trim().length > 0 &&
    (hasSalaryHistory || dailyRate.trim().length > 0) &&
    Number.isFinite(rateNumber) &&
    rateNumber > 0 &&
    Number.isFinite(congesNumber) &&
    congesNumber >= 0 &&
    Number.isFinite(rttNumber) &&
    rttNumber >= 0;

  const recordGrossNumber = Number(recordGross);
  const recordChargesNumber = Number(recordCharges);
  const canAddRecord =
    recordDate.trim().length > 0 &&
    Number.isFinite(recordGrossNumber) &&
    recordGrossNumber > 0 &&
    Number.isFinite(recordChargesNumber) &&
    recordChargesNumber >= 0;

  function addRecord() {
    if (!canAddRecord) return;
    const record: SalaryRecord = { startDate: recordDate, grossMonthlySalary: recordGrossNumber, chargesPercent: recordChargesNumber };
    // Replace any existing record for the same date, to allow correcting a mistake.
    setSalaryHistory((history) => [...history.filter((r) => r.startDate !== recordDate), record]);
    setRecordDate('');
    setRecordGross('');
    setRecordCharges('');
  }

  function removeRecord(startDate: string) {
    setSalaryHistory((history) => history.filter((r) => r.startDate !== startDate));
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      name: name.trim(),
      role,
      dailyRate: rateNumber,
      accessLevel,
      congesPerYear: congesNumber,
      rttPerYear: rttNumber,
      salaryHistory,
    });
  };

  const sortedHistory = [...salaryHistory].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" style={{ width: 'min(520px, 100%)' }} onSubmit={handleSubmit}>
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

        {hasSalaryHistory ? (
          <div className="field">
            <label>Taux journalier moyen (TJM)</label>
            <div className={`tmm-computed-rate${hasEffectiveRecord ? '' : ' tmm-computed-rate-pending'}`}>
              {computedRate!.toLocaleString('fr-FR')} €/j
              {hasEffectiveRecord
                ? ' — calculé depuis le salaire ci-dessous'
                : ' — dernier taux connu (le salaire ci-dessous n\'est pas encore effectif)'}
            </div>
          </div>
        ) : (
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
        )}

        <div className="field">
          <label>Historique de salaire</label>
          {sortedHistory.length > 0 && (
            <table className="table tmm-salary-table">
              <thead>
                <tr>
                  <th>Depuis</th>
                  <th>Brut mensuel</th>
                  <th>Charges</th>
                  <th>Charge (€)</th>
                  <th>TJM</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((record) => (
                  <tr key={record.startDate}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatFullDate(fromISODate(record.startDate))}</td>
                    <td>{record.grossMonthlySalary.toLocaleString('fr-FR')} €</td>
                    <td>{record.chargesPercent} %</td>
                    <td>{chargeAmount(record).toLocaleString('fr-FR')} €</td>
                    <td>{dailyRateFor(record).toLocaleString('fr-FR')} €/j</td>
                    <td>
                      <button type="button" className="btn btn-secondary" onClick={() => removeRecord(record.startDate)}>
                        Retirer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="tmm-add-record">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="tmm-record-date">À partir du</label>
              <input id="tmm-record-date" type="date" className="input" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="tmm-record-gross">Brut mensuel</label>
              <input
                id="tmm-record-gross"
                type="number"
                className="input"
                min={0}
                step={1}
                value={recordGross}
                onChange={(e) => setRecordGross(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="tmm-record-charges">Charges (%)</label>
              <input
                id="tmm-record-charges"
                type="number"
                className="input"
                min={0}
                max={100}
                step={0.1}
                value={recordCharges}
                onChange={(e) => setRecordCharges(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-secondary" onClick={addRecord} disabled={!canAddRecord}>
              Ajouter
            </button>
          </div>
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
