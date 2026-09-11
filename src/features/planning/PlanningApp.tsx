import { useMemo, useState } from 'react';
import {
  approveRequest,
  refuseRequest,
  useAllocationOverrides,
  useBookings,
  usePeople,
  useProjects,
  useRequests,
  useTimesheets,
} from '../../lib/repository';
import { Equipe } from './Equipe';
import { NavRail, type PlanningView } from './NavRail';
import { PermanentAllocations } from './PermanentAllocations';
import { PlanDeCharge } from './PlanDeCharge';
import { PlanDeProduction } from './PlanDeProduction';
import { Projects } from './Projects';
import { RequestsModal } from './RequestsModal';
import { Semainier } from './Semainier';
import { Timesheets } from './Timesheets';

export function PlanningApp() {
  const { data: people, loading: peopleLoading } = usePeople();
  const { data: projects } = useProjects();
  const { data: bookings } = useBookings();
  const { data: requests } = useRequests();
  const { data: timesheets } = useTimesheets();
  const { data: allocationOverrides } = useAllocationOverrides();

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

      {view === 'charge' && (
        <PlanDeCharge people={people} peopleLoading={peopleLoading} projects={projects} bookings={bookings} />
      )}
      {view === 'production' && <PlanDeProduction people={people} projects={projects} bookings={bookings} />}
      {view === 'semainier' && <Semainier people={people} projects={projects} bookings={bookings} />}
      {view === 'timesheets' && <Timesheets people={people} projects={projects} timesheets={timesheets} />}
      {view === 'affectation' && (
        <PermanentAllocations
          people={people}
          projects={projects}
          bookings={bookings}
          timesheets={timesheets}
          allocationOverrides={allocationOverrides}
        />
      )}
      {view === 'projets' && <Projects projects={projects} bookings={bookings} people={people} />}
      {view === 'equipe' && <Equipe people={people} />}

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
