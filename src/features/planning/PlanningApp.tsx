import { useMemo, useState } from 'react';
import {
  approveRequest,
  refuseRequest,
  useAllocationOverrides,
  useBookings,
  usePeople,
  useProjects,
  usePublicHolidays,
  useRequests,
  useTimesheets,
} from '../../lib/repository';
import { resolveTestPersonId, useTestRole } from '../../lib/testRole';
import { Equipe } from './Equipe';
import { MyAbsences } from './MyAbsences';
import { NavRail, type PlanningView } from './NavRail';
import { PermanentAllocations } from './PermanentAllocations';
import { PlanDeCharge } from './PlanDeCharge';
import { PlanDeProduction } from './PlanDeProduction';
import { Projects } from './Projects';
import { RequestsModal } from './RequestsModal';
import { Semainier } from './Semainier';
import { Timesheets } from './Timesheets';

const HIDDEN_FOR_USER: PlanningView[] = ['charge', 'production'];

export function PlanningApp() {
  const { role, personId } = useTestRole();
  const { data: people, loading: peopleLoading } = usePeople();
  const { data: projects } = useProjects();
  const { data: bookings } = useBookings();
  const { data: requests } = useRequests();
  const { data: timesheets } = useTimesheets();
  const { data: allocationOverrides } = useAllocationOverrides();
  const { data: holidays } = usePublicHolidays();

  const [view, setView] = useState<PlanningView>('charge');
  const [requestsOpen, setRequestsOpen] = useState(false);
  const effectiveView = role === 'user' && HIDDEN_FOR_USER.includes(view) ? 'semainier' : view;

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const testPersonId = resolveTestPersonId(personId, people);
  // Admin sees every pending request. Everyone else sees their own pending
  // request (so they can track it) plus, for a Responsable, the ones sent
  // to them as manager — a plain User only ever sees their own.
  const pendingRequestCount = requests.filter((r) => {
    if (r.status !== 'pending') return false;
    if (role === 'admin') return true;
    if (r.personId === testPersonId) return true;
    return role === 'responsable' && peopleById.get(r.personId)?.managerId === testPersonId;
  }).length;

  return (
    <div className="pdc-layout">
      <NavRail
        people={people}
        pendingRequestCount={pendingRequestCount}
        onOpenRequests={() => setRequestsOpen(true)}
        activeView={effectiveView}
        onNavigate={setView}
      />

      {effectiveView === 'charge' && (
        <PlanDeCharge people={people} peopleLoading={peopleLoading} projects={projects} bookings={bookings} />
      )}
      {effectiveView === 'production' && <PlanDeProduction people={people} projects={projects} bookings={bookings} />}
      {effectiveView === 'semainier' && <Semainier people={people} projects={projects} bookings={bookings} />}
      {effectiveView === 'timesheets' && <Timesheets people={people} projects={projects} timesheets={timesheets} />}
      {effectiveView === 'affectation' && (
        <PermanentAllocations
          people={people}
          projects={projects}
          bookings={bookings}
          timesheets={timesheets}
          allocationOverrides={allocationOverrides}
        />
      )}
      {effectiveView === 'absences' && <MyAbsences people={people} requests={requests} bookings={bookings} />}
      {effectiveView === 'projets' && <Projects projects={projects} bookings={bookings} people={people} />}
      {effectiveView === 'equipe' && <Equipe people={people} holidays={holidays} />}

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
