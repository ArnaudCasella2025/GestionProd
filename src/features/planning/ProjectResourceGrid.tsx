import { deleteBooking, updateBookingDates } from '../../lib/repository';
import type { Booking, Person, Project } from '../../types';
import { BookingPopover } from './BookingPopover';
import { CalendarGrid } from './CalendarGrid';
import { DetailPanel } from './DetailPanel';
import type { TimeUnit } from './timeUnits';
import { useBookingGrid } from './useBookingGrid';

interface ProjectResourceGridProps {
  people: Person[];
  units: TimeUnit[];
  bookings: Booking[];
  projects: Project[];
  projectsById: Map<string, Project>;
  peopleById: Map<string, Person>;
  conflictsByPerson: Map<string, Set<string>>;
}

/**
 * The expanded contents of a Plan de production project row: the same
 * interactive booking grid as Plan de charge (drag to book, click to edit),
 * scoped to just the people assigned to this project. It reads and writes
 * the same `bookings` collection, so changes here show up in Plan de charge
 * too, and vice versa.
 */
export function ProjectResourceGrid({
  people,
  units,
  bookings,
  projects,
  projectsById,
  peopleById,
  conflictsByPerson,
}: ProjectResourceGridProps) {
  const {
    dragSelection,
    createPopover,
    detailPanel,
    setDetailPanel,
    closePanels,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    applyBooking,
    handleBookingClick,
  } = useBookingGrid(people, units);

  const detailPerson = detailPanel ? peopleById.get(detailPanel.booking.personId) : undefined;
  const detailProject = detailPanel?.booking.projectId ? projectsById.get(detailPanel.booking.projectId) : undefined;

  return (
    <>
      <CalendarGrid
        people={people}
        units={units}
        bookings={bookings}
        projectsById={projectsById}
        conflictsByPerson={conflictsByPerson}
        dragSelection={dragSelection}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onCellMouseUp={handleCellMouseUp}
        onBookingClick={handleBookingClick}
      />

      {createPopover && (
        <>
          <div className="pdc-popover-scrim" onClick={closePanels} />
          <BookingPopover
            x={createPopover.x}
            y={createPopover.y}
            projects={projects}
            onSelectProject={(projectId) => applyBooking({ projectId })}
            onSelectAbsence={(absenceType) => applyBooking({ absenceType })}
          />
        </>
      )}

      {detailPanel && (
        <>
          <div className="pdc-popover-scrim" onClick={() => setDetailPanel(null)} />
          <DetailPanel
            key={detailPanel.booking.id}
            x={detailPanel.x}
            y={detailPanel.y}
            booking={detailPanel.booking}
            person={detailPerson}
            project={detailProject}
            onRelease={() => {
              deleteBooking(detailPanel.booking.id).catch(console.error);
              setDetailPanel(null);
            }}
            onSaveDates={(startDate, endDate, startHalf, endHalf) => {
              updateBookingDates(detailPanel.booking.id, startDate, endDate, startHalf, endHalf).catch(console.error);
              setDetailPanel(null);
            }}
          />
        </>
      )}
    </>
  );
}
