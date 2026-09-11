import { addDays, toISODate } from '../lib/dates';
import type { AbsenceRequest, Booking, Person, Project, PublicHoliday } from '../types';

const today = new Date();
const iso = (offsetDays: number) => toISODate(addDays(today, offsetDays));

export const DEMO_PEOPLE: Person[] = [
  { id: 'p1', name: 'Camille Roussel', role: 'Réalisatrice', dailyRate: 520 },
  { id: 'p2', name: 'Yanis Belkacem', role: 'Game designer', dailyRate: 380 },
  { id: 'p3', name: 'Léa Fontaine', role: 'Character artist', dailyRate: 340 },
  { id: 'p4', name: 'Hugo Vasseur', role: 'Développeur gameplay', dailyRate: 400 },
  { id: 'p5', name: 'Nora Chibane', role: 'Monteuse', dailyRate: 300 },
  { id: 'p6', name: 'Thomas Weiss', role: 'Sound designer', dailyRate: 320 },
];

export const DEMO_PROJECTS: Project[] = [
  { id: 'pr1', name: 'Aurora Drift', client: 'Studio Meridian', color: '#0088b0', budget: 180000 },
  { id: 'pr2', name: 'Court-métrage "Rive"', client: 'Arte France', color: '#d6006c', budget: 65000 },
  { id: 'pr3', name: 'Nightfall Protocol', client: 'Auto-édité', color: '#8a6d00', budget: 240000 },
  { id: 'pr4', name: 'Série "Kilomètre 0"', client: 'France TV', color: '#3a7d3a', budget: 120000 },
];

export const DEMO_BOOKINGS: Booking[] = [
  { id: 'b1', personId: 'p1', projectId: 'pr2', startDate: iso(-6), endDate: iso(-2) },
  { id: 'b2', personId: 'p1', projectId: 'pr4', startDate: iso(-1), endDate: iso(6) },
  { id: 'b3', personId: 'p2', projectId: 'pr1', startDate: iso(-10), endDate: iso(4) },
  { id: 'b4', personId: 'p2', projectId: 'pr3', startDate: iso(2), endDate: iso(5) }, // overlaps b3 -> conflict
  { id: 'b5', personId: 'p3', projectId: 'pr1', startDate: iso(-3), endDate: iso(9) },
  { id: 'b6', personId: 'p4', projectId: 'pr3', startDate: iso(-8), endDate: iso(-1) },
  { id: 'b7', personId: 'p4', projectId: 'pr1', startDate: iso(0), endDate: iso(10) },
  { id: 'b8', personId: 'p5', projectId: 'pr2', startDate: iso(-4), endDate: iso(3) },
  { id: 'b9', personId: 'p5', absenceType: 'conge', startDate: iso(4), endDate: iso(6) },
  { id: 'b10', personId: 'p6', projectId: 'pr4', startDate: iso(-2), endDate: iso(7) },
  { id: 'b11', personId: 'p6', absenceType: 'teletravail', startDate: iso(-9), endDate: iso(-9) },
  { id: 'b12', personId: 'p3', absenceType: 'maladie', startDate: iso(-1), endDate: iso(-1) },
];

export const DEMO_REQUESTS: AbsenceRequest[] = [
  { id: 'r1', personId: 'p2', type: 'conge', startDate: iso(12), endDate: iso(16), status: 'pending' },
  { id: 'r2', personId: 'p6', type: 'rtt', startDate: iso(3), endDate: iso(3), status: 'pending' },
  { id: 'r3', personId: 'p4', type: 'maladie', startDate: iso(-1), endDate: iso(0), status: 'pending' },
];

export const DEMO_HOLIDAYS: PublicHoliday[] = [
  { id: 'h1', date: '2026-01-01', label: "Jour de l'an" },
  { id: 'h2', date: '2026-04-06', label: 'Lundi de Pâques' },
  { id: 'h3', date: '2026-05-01', label: 'Fête du Travail' },
  { id: 'h4', date: '2026-05-08', label: 'Victoire 1945' },
  { id: 'h5', date: '2026-05-14', label: 'Ascension' },
  { id: 'h6', date: '2026-05-25', label: 'Lundi de Pentecôte' },
  { id: 'h7', date: '2026-07-14', label: 'Fête nationale' },
  { id: 'h8', date: '2026-08-15', label: 'Assomption' },
  { id: 'h9', date: '2026-11-01', label: 'Toussaint' },
  { id: 'h10', date: '2026-11-11', label: 'Armistice 1918' },
  { id: 'h11', date: '2026-12-25', label: 'Noël' },
];
