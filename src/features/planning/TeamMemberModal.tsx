import { useState, type FormEvent } from 'react';
import { formatFullDate, fromISODate, toISODate } from '../../lib/dates';
import {
  ACCESS_LEVEL_LABELS,
  DEFAULT_CONGES_PER_YEAR,
  DEFAULT_RTT_PER_YEAR,
  DEFAULT_TELETRAVAIL_DAYS_PER_WEEK,
  DEFAULT_WORK_DAYS_PER_WEEK,
  JOB_TITLES,
  type AccessLevel,
  type Person,
  type SalaryRecord,
} from '../../types';
import { chargeAmount, dailyRateFor, dailyRateOn, recordEffectiveOn, socialChargesPercentOn } from './salaryCalc';
import { SocialChargesModal } from './SocialChargesModal';

interface TeamMemberModalProps {
  /** Present when editing an existing member; absent when creating a new one. */
  initial?: Person;
  /** The rest of the team, to offer as manager candidates (Admin/Responsable only). */
  people: Person[];
  onSave: (data: {
    name: string;
    role: string;
    dailyRate: number;
    accessLevel: AccessLevel;
    congesPerYear: number;
    rttPerYear: number;
    salaryHistory: SalaryRecord[];
    teletravailDaysPerWeek: number;
    workDaysPerWeek: number;
    managerId: string | null;
    workingWeekdays: number[] | null;
    socialChargesByMonth: Record<string, number>;
  }) => void;
  onClose: () => void;
}

const ACCESS_LEVELS: AccessLevel[] = ['admin', 'responsable', 'user'];
const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
];

export function TeamMemberModal({ initial, people, onSave, onClose }: TeamMemberModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? JOB_TITLES[0]);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(initial?.accessLevel ?? 'user');
  const [congesPerYear, setCongesPerYear] = useState(String(initial?.congesPerYear ?? DEFAULT_CONGES_PER_YEAR));
  const [rttPerYear, setRttPerYear] = useState(String(initial?.rttPerYear ?? DEFAULT_RTT_PER_YEAR));
  const [teletravailDaysPerWeek, setTeletravailDaysPerWeek] = useState(
    String(initial?.teletravailDaysPerWeek ?? DEFAULT_TELETRAVAIL_DAYS_PER_WEEK),
  );
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(String(initial?.workDaysPerWeek ?? DEFAULT_WORK_DAYS_PER_WEEK));
  const [workingWeekdays, setWorkingWeekdays] = useState<number[]>(initial?.workingWeekdays ?? []);
  const [managerId, setManagerId] = useState(initial?.managerId ?? '');
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>(initial?.salaryHistory ?? []);
  const [socialChargesByMonth, setSocialChargesByMonth] = useState<Record<string, number>>(initial?.socialChargesByMonth ?? {});
  const [chargesModalOpen, setChargesModalOpen] = useState(false);

  const managerCandidates = people.filter(
    (p) => p.id !== initial?.id && (p.accessLevel === 'admin' || p.accessLevel === 'responsable'),
  );

  const todayIso = toISODate(new Date());
  const [recordDate, setRecordDate] = useState(todayIso);
  const [recordGross, setRecordGross] = useState('');
  const hasSalaryHistory = salaryHistory.length > 0;
  // A person with no salary history yet (created before this feature existed)
  // keeps whatever flat rate they already had, until someone declares a real salary for them.
  const legacyRate = initial?.dailyRate;
  // Falls back to the person's last known rate if every salary record is dated
  // in the future (nothing is effective yet as of today).
  const computedRate = hasSalaryHistory ? dailyRateOn(salaryHistory, todayIso, legacyRate ?? 0, socialChargesByMonth) : null;
  const hasEffectiveRecord = hasSalaryHistory && recordEffectiveOn(salaryHistory, todayIso) != null;
  const effectiveRate = computedRate ?? legacyRate ?? null;

  const congesNumber = Number(congesPerYear);
  const rttNumber = Number(rttPerYear);
  const teletravailNumber = Number(teletravailDaysPerWeek);
  const workDaysNumber = Number(workDaysPerWeek);
  // Below 5 days/week, the admin must say exactly which weekdays those are —
  // this is what Plan de charge actually enforces per person, so a count
  // alone (e.g. "4") is never enough to know it's Mon-Thu vs. Tue-Fri.
  const needsWeekdayPicker = Number.isFinite(workDaysNumber) && workDaysNumber > 0 && workDaysNumber < 5;
  const weekdaysValid = !needsWeekdayPicker || workingWeekdays.length === workDaysNumber;
  const otherFieldsValid =
    name.trim().length > 0 &&
    Number.isFinite(congesNumber) &&
    congesNumber >= 0 &&
    Number.isFinite(rttNumber) &&
    rttNumber >= 0 &&
    Number.isFinite(teletravailNumber) &&
    teletravailNumber >= 0 &&
    Number.isFinite(workDaysNumber) &&
    workDaysNumber > 0 &&
    workDaysNumber <= 7 &&
    weekdaysValid;
  const isValid = otherFieldsValid && effectiveRate != null && effectiveRate > 0;

  function toggleWeekday(day: number) {
    setWorkingWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  const recordGrossNumber = Number(recordGross);
  const canAddRecord = recordDate.trim().length > 0 && Number.isFinite(recordGrossNumber) && recordGrossNumber > 0;

  // A filled-in but not-yet-added salary row shouldn't block saving — it's
  // easy to miss that "Ajouter" (for the row) is a separate click from
  // "Ajouter"/"Enregistrer" (for the whole member). Submitting folds it in.
  const canSubmit = isValid || (otherFieldsValid && canAddRecord);

  function addRecord() {
    if (!canAddRecord) return;
    const record: SalaryRecord = { startDate: recordDate, grossMonthlySalary: recordGrossNumber };
    // Replace any existing record for the same date, to allow correcting a mistake.
    setSalaryHistory((history) => [...history.filter((r) => r.startDate !== recordDate), record]);
    setRecordDate(todayIso);
    setRecordGross('');
  }

  function removeRecord(startDate: string) {
    setSalaryHistory((history) => history.filter((r) => r.startDate !== startDate));
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const finalHistory = canAddRecord
      ? [...salaryHistory.filter((r) => r.startDate !== recordDate), { startDate: recordDate, grossMonthlySalary: recordGrossNumber }]
      : salaryHistory;
    const finalRate =
      finalHistory.length > 0 ? dailyRateOn(finalHistory, todayIso, legacyRate ?? 0, socialChargesByMonth) : effectiveRate;
    if (finalRate == null || finalRate <= 0) return;
    onSave({
      name: name.trim(),
      role,
      dailyRate: finalRate,
      accessLevel,
      congesPerYear: congesNumber,
      rttPerYear: rttNumber,
      salaryHistory: finalHistory,
      teletravailDaysPerWeek: teletravailNumber,
      workDaysPerWeek: workDaysNumber,
      managerId: managerId || null,
      workingWeekdays: needsWeekdayPicker ? workingWeekdays : null,
      socialChargesByMonth,
    });
  };

  const sortedHistory = [...salaryHistory].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <>
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

        <div className="field">
          <label>Taux journalier moyen (TJM)</label>
          {hasSalaryHistory ? (
            <div className={`tmm-computed-rate${hasEffectiveRecord ? '' : ' tmm-computed-rate-pending'}`}>
              {computedRate!.toLocaleString('fr-FR')} €/j
              {hasEffectiveRecord
                ? ' — calculé depuis le salaire et les charges sociales ci-dessous'
                : ' — dernier taux connu (le salaire ci-dessous n\'est pas encore effectif)'}
            </div>
          ) : legacyRate != null ? (
            <div className="tmm-computed-rate tmm-computed-rate-legacy">
              {legacyRate.toLocaleString('fr-FR')} €/j — valeur héritée, ajoutez un salaire ci-dessous pour le calculer automatiquement
            </div>
          ) : (
            <div className="tmm-computed-rate tmm-computed-rate-pending">Aucun salaire renseigné — ajoutez-en un ci-dessous</div>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 'var(--space-2)' }}
            onClick={() => setChargesModalOpen(true)}
          >
            Charges sociales
          </button>
        </div>

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
                {sortedHistory.map((record) => {
                  const percent = socialChargesPercentOn(socialChargesByMonth, salaryHistory, record.startDate);
                  return (
                    <tr key={record.startDate}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatFullDate(fromISODate(record.startDate))}</td>
                      <td>{record.grossMonthlySalary.toLocaleString('fr-FR')} €</td>
                      <td>{percent} %</td>
                      <td>{chargeAmount(record.grossMonthlySalary, percent).toLocaleString('fr-FR')} €</td>
                      <td>{dailyRateFor(record.grossMonthlySalary, percent).toLocaleString('fr-FR')} €/j</td>
                      <td>
                        <button type="button" className="btn btn-secondary" onClick={() => removeRecord(record.startDate)}>
                          Retirer
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="team-work-days">Jours travaillés / semaine</label>
            <input
              id="team-work-days"
              className="input"
              type="number"
              min={1}
              max={7}
              step={1}
              value={workDaysPerWeek}
              onChange={(e) => setWorkDaysPerWeek(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="team-teletravail">Télétravail (j/semaine)</label>
            <input
              id="team-teletravail"
              className="input"
              type="number"
              min={0}
              step={1}
              value={teletravailDaysPerWeek}
              onChange={(e) => setTeletravailDaysPerWeek(e.target.value)}
              required
            />
          </div>
        </div>

        {needsWeekdayPicker && (
          <div className="field">
            <label>Jours travaillés</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className="tmm-weekday-toggle">
                  <input
                    type="checkbox"
                    checked={workingWeekdays.includes(day.value)}
                    onChange={() => toggleWeekday(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <p className={`text-muted${weekdaysValid ? '' : ' tmm-weekday-warning'}`} style={{ fontSize: 12, marginTop: 4 }}>
              {weekdaysValid
                ? "Ces jours seront bloqués pour l'affectation sur Plan de charge le reste de la semaine."
                : `Sélectionnez exactement ${workDaysNumber} jour${workDaysNumber > 1 ? 's' : ''} (${workingWeekdays.length} sélectionné${workingWeekdays.length > 1 ? 's' : ''}).`}
            </p>
          </div>
        )}

        <div className="field">
          <label htmlFor="team-manager">Manager</label>
          <select id="team-manager" className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">Non assigné</option>
            {managerCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ACCESS_LEVEL_LABELS[p.accessLevel ?? 'user']})
              </option>
            ))}
          </select>
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
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
      </div>

      {chargesModalOpen && (
        <SocialChargesModal
          chargesByMonth={socialChargesByMonth}
          salaryHistory={salaryHistory}
          onSave={(next) => {
            setSocialChargesByMonth(next);
            setChargesModalOpen(false);
          }}
          onClose={() => setChargesModalOpen(false)}
        />
      )}
    </>
  );
}
