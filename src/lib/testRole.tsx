import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AccessLevel, Person } from '../types';

interface TestRoleContextValue {
  role: AccessLevel;
  setRole: (role: AccessLevel) => void;
  /** Which team member the "User" test role personalizes screens for
   * (Semainier, Timesheets, Mes absences, Projets). Ignored for Admin/Responsable,
   * who see everyone. */
  personId: string;
  setPersonId: (personId: string) => void;
}

const TestRoleContext = createContext<TestRoleContextValue | null>(null);

const STORAGE_KEY = 'gestionprod-test-role';
const PERSON_STORAGE_KEY = 'gestionprod-test-person';

function readStoredRole(): AccessLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'admin' || stored === 'responsable' || stored === 'user') return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through to the default.
  }
  return 'admin';
}

function readStoredPersonId(): string {
  try {
    return localStorage.getItem(PERSON_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * A client-side-only stand-in for real role assignment, so the app's
 * access-level restrictions can be tried out without creating several
 * accounts. Not a security boundary — see the Firestore rules and the
 * README for what's actually enforced.
 */
export function TestRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AccessLevel>(readStoredRole);
  const [personId, setPersonId] = useState<string>(readStoredPersonId);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // Ignore — this is just a testing convenience.
    }
  }, [role]);

  useEffect(() => {
    try {
      localStorage.setItem(PERSON_STORAGE_KEY, personId);
    } catch {
      // Ignore — this is just a testing convenience.
    }
  }, [personId]);

  return <TestRoleContext.Provider value={{ role, setRole, personId, setPersonId }}>{children}</TestRoleContext.Provider>;
}

export function useTestRole(): TestRoleContextValue {
  const ctx = useContext(TestRoleContext);
  if (!ctx) throw new Error('useTestRole must be used within a TestRoleProvider');
  return ctx;
}

/** Resolves the test person to personalize a screen for, falling back to the
 * first team member if none is set (or the stored one no longer exists). */
export function resolveTestPersonId(personId: string, people: Person[]): string {
  if (personId && people.some((p) => p.id === personId)) return personId;
  return people[0]?.id ?? '';
}
