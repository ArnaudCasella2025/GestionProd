import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { AbsenceRequest, AllocationOverride, Booking, DayHalf, Person, Project, TimesheetDay, TimesheetHourSlot } from '../types';
import { DEMO_PEOPLE, DEMO_PROJECTS, DEMO_BOOKINGS, DEMO_REQUESTS } from '../data/demoData';

function useCollectionData<T>(name: string): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, name)),
      (snapshot) => {
        setData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setLoading(false);
      },
      (error) => {
        console.error(`Erreur de lecture Firestore (${name}):`, error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [name]);

  return { data, loading };
}

export const usePeople = () => useCollectionData<Person>('people');
export const useProjects = () => useCollectionData<Project>('projects');
export const useBookings = () => useCollectionData<Booking>('bookings');
export const useRequests = () => useCollectionData<AbsenceRequest>('requests');
export const useTimesheets = () => useCollectionData<TimesheetDay>('timesheets');
export const useAllocationOverrides = () => useCollectionData<AllocationOverride>('allocationOverrides');

export async function createBooking(booking: Omit<Booking, 'id'>) {
  await addDoc(collection(db, 'bookings'), booking);
}

export async function deleteBooking(id: string) {
  await deleteDoc(doc(db, 'bookings', id));
}

export async function updateBookingDates(
  id: string,
  startDate: string,
  endDate: string,
  startHalf: DayHalf,
  endHalf: DayHalf,
) {
  await updateDoc(doc(db, 'bookings', id), { startDate, endDate, startHalf, endHalf });
}

export async function createPerson(person: Omit<Person, 'id'>) {
  await addDoc(collection(db, 'people'), person);
}

export async function updatePerson(id: string, changes: Omit<Person, 'id'>) {
  await updateDoc(doc(db, 'people', id), changes);
}

export async function deletePerson(id: string) {
  await deleteDoc(doc(db, 'people', id));
}

export async function createProject(project: Omit<Project, 'id'>) {
  await addDoc(collection(db, 'projects'), project);
}

export async function updateProject(id: string, changes: Omit<Project, 'id'>) {
  await updateDoc(doc(db, 'projects', id), changes);
}

export async function deleteProject(id: string) {
  await deleteDoc(doc(db, 'projects', id));
}

/** Overwrites a person's whole day of declared hours (one doc per person per day). */
export async function setTimesheetDay(personId: string, date: string, hours: (TimesheetHourSlot | null)[]) {
  await setDoc(doc(db, 'timesheets', `${personId}_${date}`), { personId, date, hours });
}

/** Sets (or replaces) the manual "Officiel" override for one person/project/month. */
export async function setAllocationOverride(personId: string, projectId: string, year: number, month: number, days: number) {
  await setDoc(doc(db, 'allocationOverrides', `${personId}_${projectId}_${year}_${month}`), {
    personId,
    projectId,
    year,
    month,
    days,
  });
}

/** Clears a manual override so the cell falls back to the calculated value. */
export async function deleteAllocationOverride(personId: string, projectId: string, year: number, month: number) {
  await deleteDoc(doc(db, 'allocationOverrides', `${personId}_${projectId}_${year}_${month}`));
}

export async function approveRequest(request: AbsenceRequest) {
  const batch = writeBatch(db);
  const bookingRef = doc(collection(db, 'bookings'));
  batch.set(bookingRef, {
    personId: request.personId,
    absenceType: request.type,
    startDate: request.startDate,
    endDate: request.endDate,
  } satisfies Omit<Booking, 'id'>);
  batch.update(doc(db, 'requests', request.id), { status: 'approved' });
  await batch.commit();
}

export async function refuseRequest(id: string) {
  await updateDoc(doc(db, 'requests', id), { status: 'refused' });
}

/** Seeds the Firestore database with demo data. Safe to call once on an empty project. */
export async function seedDemoData() {
  const batch = writeBatch(db);
  for (const person of DEMO_PEOPLE) {
    const { id, ...rest } = person;
    batch.set(doc(db, 'people', id), rest);
  }
  for (const project of DEMO_PROJECTS) {
    const { id, ...rest } = project;
    batch.set(doc(db, 'projects', id), rest);
  }
  for (const booking of DEMO_BOOKINGS) {
    const { id, ...rest } = booking;
    batch.set(doc(db, 'bookings', id), rest);
  }
  for (const request of DEMO_REQUESTS) {
    const { id, ...rest } = request;
    batch.set(doc(db, 'requests', id), rest);
  }
  await batch.commit();
}
