import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AccessLevel } from '../types';

interface TestRoleContextValue {
  role: AccessLevel;
  setRole: (role: AccessLevel) => void;
}

const TestRoleContext = createContext<TestRoleContextValue | null>(null);

const STORAGE_KEY = 'gestionprod-test-role';

function readStoredRole(): AccessLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'admin' || stored === 'responsable' || stored === 'user') return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through to the default.
  }
  return 'admin';
}

/**
 * A client-side-only stand-in for real role assignment, so the app's
 * access-level restrictions can be tried out without creating several
 * accounts. Not a security boundary — see the Firestore rules and the
 * README for what's actually enforced.
 */
export function TestRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AccessLevel>(readStoredRole);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // Ignore — this is just a testing convenience.
    }
  }, [role]);

  return <TestRoleContext.Provider value={{ role, setRole }}>{children}</TestRoleContext.Provider>;
}

export function useTestRole(): TestRoleContextValue {
  const ctx = useContext(TestRoleContext);
  if (!ctx) throw new Error('useTestRole must be used within a TestRoleProvider');
  return ctx;
}
