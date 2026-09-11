import { useMemo, useState, type FormEvent } from 'react';
import { formatFullDate, fromISODate } from '../../lib/dates';
import { createRequest } from '../../lib/repository';
import {
  ABSENCE_LABELS,
  REQUESTABLE_ABSENCE_TYPES,
  type AbsenceRequest,
  type AbsenceType,
  type Person,
  type RequestStatus,
} from '../../types';
import { leaveBalance, requestWorkdayCount } from './absenceCalc';

interface MyAbsencesProps {
  people: Person[];
  requests: AbsenceRequest[];
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'En attente',
  approved: 'Validée',
  refused: 'Refusée',
};
const STATUS_TAG_CLASS: Record<RequestStatus, string> = {
  pending: 'tag-accent',
  approved: 'tag-success',
  refused: 'tag-neutral',
};

export function MyAbsences({ people, requests }: MyAbsencesProps) {
  const [personId, setPersonId] = useState(() => people[0]?.id ?? '');
  const [type, setType] = useState<AbsenceType>('conge');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const person = people.find((p) => p.id === personId);
  const year = new Date().getFullYear();

  const congeBalance = person ? leaveBalance(person, requests, 'conge', year) : null;
  const rttBalance = person ? leaveBalance(person, requests, 'rtt', year) : null;
  const relevantBalance = type === 'conge' ? congeBalance : type === 'rtt' ? rttBalance : null;

  const myRequests = useMemo(
    () => requests.filter((r) => r.personId === personId).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [requests, personId],
  );

  const validRange = Boolean(startDate && endDate && startDate <= endDate);
  const requestedDays = validRange ? requestWorkdayCount(startDate, endDate) : 0;
  const exceedsBalance = relevantBalance != null && requestedDays > relevantBalance.remaining;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!personId || !validRange) return;
    createRequest(personId, type, startDate, endDate).catch(console.error);
    setStartDate('');
    setEndDate('');
  }

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Mes absences</h1>
        <p className="text-muted">
          Demandez un congé ou une RTT, ou déclarez un arrêt maladie — chaque demande passe par la validation de la
          direction de production. Le télétravail ne nécessite pas de demande : déclarez-le directement dans le Plan
          de charge ou les Timesheets.
        </p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

      <div className="pdc-toolbar">
        <div className="field" style={{ marginBottom: 0 }}>
          <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)} style={{ width: 260 }}>
            {people.length === 0 && <option value="">Aucune ressource</option>}
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!person ? (
        <p className="text-muted">Aucune ressource disponible.</p>
      ) : (
        <>
          <div className="ma-balances">
            <div className="card ma-balance-card">
              <div className="card-kicker">Congés {year}</div>
              <div className="ma-balance-figure">{congeBalance!.remaining} j restants</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {congeBalance!.quota} j/an · {congeBalance!.used} j pris
                {congeBalance!.pending > 0 ? ` · ${congeBalance!.pending} j en attente` : ''}
              </div>
            </div>
            <div className="card ma-balance-card">
              <div className="card-kicker">RTT {year}</div>
              <div className="ma-balance-figure">{rttBalance!.remaining} j restants</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {rttBalance!.quota} j/an · {rttBalance!.used} j pris
                {rttBalance!.pending > 0 ? ` · ${rttBalance!.pending} j en attente` : ''}
              </div>
            </div>
          </div>

          <form className="card ma-request-form" onSubmit={handleSubmit}>
            <div className="card-kicker">Nouvelle demande</div>
            <div className="ma-request-fields">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="ma-type">Type</label>
                <select id="ma-type" className="input" value={type} onChange={(e) => setType(e.target.value as AbsenceType)}>
                  {REQUESTABLE_ABSENCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ABSENCE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="ma-start">Du</label>
                <input id="ma-start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="ma-end">Au</label>
                <input id="ma-end" type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!validRange}>
                Envoyer la demande
              </button>
            </div>
            {requestedDays > 0 && (
              <p className={`text-muted ma-request-hint${exceedsBalance ? ' ma-request-hint-warning' : ''}`}>
                {requestedDays} jour{requestedDays > 1 ? 's' : ''} ouvré{requestedDays > 1 ? 's' : ''}
                {relevantBalance ? ` · solde après validation : ${relevantBalance.remaining - requestedDays} j` : ''}
                {exceedsBalance ? ' — dépasse le solde disponible' : ''}
              </p>
            )}
          </form>

          <h2 style={{ marginTop: 'var(--space-6)' }}>Historique</h2>
          {myRequests.length === 0 ? (
            <p className="text-muted">Aucune demande pour l'instant.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Jours ouvrés</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="tag tag-neutral">{ABSENCE_LABELS[r.type]}</span>
                    </td>
                    <td>
                      {formatFullDate(fromISODate(r.startDate))}
                      {r.startDate !== r.endDate ? ` → ${formatFullDate(fromISODate(r.endDate))}` : ''}
                    </td>
                    <td>{requestWorkdayCount(r.startDate, r.endDate)}</td>
                    <td>
                      <span className={`tag ${STATUS_TAG_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
