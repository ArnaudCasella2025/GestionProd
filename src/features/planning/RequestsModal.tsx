import { formatFullDate, fromISODate } from '../../lib/dates';
import { resolveTestPersonId, useTestRole } from '../../lib/testRole';
import { ABSENCE_LABELS, type AbsenceRequest, type Person } from '../../types';

interface RequestsModalProps {
  requests: AbsenceRequest[];
  peopleById: Map<string, Person>;
  onApprove: (request: AbsenceRequest) => void;
  onRefuse: (id: string) => void;
  onClose: () => void;
}

export function RequestsModal({ requests, peopleById, onApprove, onRefuse, onClose }: RequestsModalProps) {
  const { role, personId } = useTestRole();
  const testPersonId = resolveTestPersonId(personId, [...peopleById.values()]);
  // Admin sees every pending request. Everyone else sees their own pending
  // request (to track it) plus, for a Responsable, the ones sent to them as
  // manager — a plain User only ever sees their own.
  const pending = requests.filter((r) => {
    if (r.status !== 'pending') return false;
    if (role === 'admin') return true;
    if (r.personId === testPersonId) return true;
    return role === 'responsable' && peopleById.get(r.personId)?.managerId === testPersonId;
  });
  // Whether the CURRENT viewer can act on a given row — never on your own
  // request (even an Admin's), only on a report's request as their manager.
  function canDecideOn(request: AbsenceRequest): boolean {
    if (request.personId === testPersonId) return false;
    if (role === 'admin') return true;
    return role === 'responsable' && peopleById.get(request.personId)?.managerId === testPersonId;
  }
  const canDecide = pending.some(canDecideOn);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(640px, 100%)' }}>
        <div className="dialog-title">Demandes d'absence</div>
        {!canDecide && (
          <p className="text-muted" style={{ marginTop: 0 }}>
            Consultation seule — la validation est réservée à la direction de production.
          </p>
        )}
        {pending.length === 0 ? (
          <p className="text-muted">Aucune demande en attente.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Type</th>
                <th>Période</th>
                {canDecide && <th />}
              </tr>
            </thead>
            <tbody>
              {pending.map((request) => {
                const person = peopleById.get(request.personId);
                const isOwnRequest = request.personId === testPersonId;
                return (
                  <tr key={request.id}>
                    <td>
                      {person?.name ?? '—'}
                      {isOwnRequest && <span className="text-muted"> (moi)</span>}
                    </td>
                    <td>
                      <span className="tag tag-accent">{ABSENCE_LABELS[request.type]}</span>
                    </td>
                    <td>
                      {formatFullDate(fromISODate(request.startDate))}
                      {request.startDate !== request.endDate ? ` → ${formatFullDate(fromISODate(request.endDate))}` : ''}
                    </td>
                    {canDecide &&
                      (canDecideOn(request) ? (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-primary" onClick={() => onApprove(request)}>
                              Valider
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => onRefuse(request.id)}>
                              Refuser
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td />
                      ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
