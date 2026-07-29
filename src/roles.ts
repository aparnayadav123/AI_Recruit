import { useEffect, useState } from 'react';

/**
 * Role-based access control (FR-901, BR-09).
 *
 * The app has one privilege boundary: "HR Manager-level" actions. MANAGER and
 * ADMIN may perform them; a Recruiter (HR) — and every other non-manager role —
 * may not. HR Manager-only actions currently are:
 *   • Hire a candidate            (CandidateDetails)
 *   • Approve / reject deletions  (DeletionRequests)
 *   • Edit Company & Integrations (Settings)
 *
 * Keep the check here (single source of truth) rather than re-deriving the role
 * string in each component, so new manager-only controls stay consistent.
 */

/** The current user's role, read from localStorage and upper-cased. '' if unknown. */
export const getUserRole = (): string => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return (u?.role || '').toString().toUpperCase();
  } catch {
    return '';
  }
};

/** True when the given role (default: current user) has HR Manager-level privilege. */
export const canManage = (role: string = getUserRole()): boolean =>
  role === 'MANAGER' || role === 'ADMIN';

/**
 * Reactive variant of {@link canManage}. Recomputes when the stored user changes
 * (login, logout, or a profile update — all of which dispatch a `storage` event),
 * so gated controls appear/disappear without a manual reload.
 */
export const useIsManager = (): boolean => {
  const [isManager, setIsManager] = useState<boolean>(() => canManage());
  useEffect(() => {
    const update = () => setIsManager(canManage());
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  return isManager;
};
