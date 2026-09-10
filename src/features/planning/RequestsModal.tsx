import { formatFullDate, fromISODate } from '../../lib/dates';
import { ABSENCE_LABELS, type AbsenceRequest, type Person } from '../../types';

interface RequestsModalProps {
  requests: AbsenceRequest[];
  peopleById: Map<string, Person>;
  onApprove: (request: AbsenceRequest) => void;
  onRefuse: (id: string) => void;
  onClose: () => void;
}

export function RequestsModal({ requests, peopleById, onApprove, onRefuse, onClose }: RequestsModalProps) {
  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={{ width: 'min(640px, 100%)' }}>
        <div className="dialog-title">Demandes d'absence</div>
        {pending.length === 0 ? (
          <p className="text-muted">Aucune demande en attente.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Type</th>
                <th>Période</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((request) => {
                const person = peopleById.get(request.personId);
                return (
                  <tr key={request.id}>
                    <td>{person?.name ?? '—'}</td>
                    <td>
                      <span className="tag tag-accent">{ABSENCE_LABELS[request.type]}</span>
                    </td>
                    <td>
                      {formatFullDate(fromISODate(request.startDate))}
                      {request.startDate !== request.endDate ? ` → ${formatFullDate(fromISODate(request.endDate))}` : ''}
                    </td>
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
