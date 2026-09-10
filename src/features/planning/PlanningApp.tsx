import { useMemo, useState } from 'react';
import { approveRequest, refuseRequest, useBookings, usePeople, useProjects, useRequests } from '../../lib/repository';
import { NavRail, type PlanningView } from './NavRail';
import { PlanDeCharge } from './PlanDeCharge';
import { PlanDeProduction } from './PlanDeProduction';
import { RequestsModal } from './RequestsModal';

export function PlanningApp() {
  const { data: people, loading: peopleLoading } = usePeople();
  const { data: projects } = useProjects();
  const { data: bookings } = useBookings();
  const { data: requests } = useRequests();

  const [view, setView] = useState<PlanningView>('charge');
  const [requestsOpen, setRequestsOpen] = useState(false);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const pendingRequestCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="pdc-layout">
      <NavRail
        projects={projects}
        pendingRequestCount={pendingRequestCount}
        onOpenRequests={() => setRequestsOpen(true)}
        activeView={view}
        onNavigate={setView}
      />

      {view === 'charge' ? (
        <PlanDeCharge people={people} peopleLoading={peopleLoading} projects={projects} bookings={bookings} />
      ) : (
        <PlanDeProduction people={people} projects={projects} bookings={bookings} />
      )}

      {requestsOpen && (
        <RequestsModal
          requests={requests}
          peopleById={peopleById}
          onApprove={(request) => approveRequest(request).catch(console.error)}
          onRefuse={(id) => refuseRequest(id).catch(console.error)}
          onClose={() => setRequestsOpen(false)}
        />
      )}
    </div>
  );
}
