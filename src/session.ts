// Client-side idle-timeout session management (EXC-006 / NFRS01).
//
// The backend intentionally runs in open/dev mode (no JWT expiry, permitAll), so
// "session expiry" is enforced HERE on the client: after a configurable idle period
// with no USER activity, the session is treated as expired. The next authenticated
// request (e.g. a Save) is then blocked and the user is redirected to the login page
// to re-authenticate. Already-saved (server-committed) data is untouched — only the
// in-progress, unsaved edit is lost.
//
// Idle is measured from real user interaction (mouse / keyboard / touch), NOT from
// background API polling, so a genuinely idle tab still times out.

const DEFAULT_IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_TIMEOUT_MIN) || 30;

/**
 * Effective idle timeout in ms. QA can shorten it for a test run via
 *   localStorage.setItem('sessionIdleMinutes', '1')
 * (no rebuild needed) and clear it with localStorage.removeItem('sessionIdleMinutes').
 */
export const idleTimeoutMs = (): number => {
    const override = Number(localStorage.getItem('sessionIdleMinutes'));
    const minutes = Number.isFinite(override) && override > 0 ? override : DEFAULT_IDLE_MINUTES;
    return minutes * 60 * 1000;
};

const LAST_ACTIVITY_KEY = 'lastActivityAt';
let lastWrite = 0;

/** Stamp "user is active now" (throttled to one write / 5s to avoid churn). */
export const markActivity = (): void => {
    const now = Date.now();
    if (now - lastWrite < 5000) return;
    lastWrite = now;
    try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch { /* ignore */ }
};

/** True once an authenticated session has been idle longer than the timeout. */
export const isSessionExpired = (): boolean => {
    if (!localStorage.getItem('token')) return false;   // not logged in → nothing to expire
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false;                             // no baseline yet → treat as active
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last > idleTimeoutMs();
};

/** Clear the session (used when idle-expiry forces re-authentication). */
export const clearSession = (): void => {
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch { /* ignore */ }
};

/**
 * Attach user-activity listeners and reset the idle baseline. Returns a cleanup
 * function. Call once from a component that wraps the authenticated app (Layout).
 */
export const startActivityTracking = (): (() => void) => {
    // Fresh baseline: the authenticated app just loaded / mounted.
    lastWrite = 0;
    markActivity();
    // Genuine-presence signals only. Deliberately EXCLUDES 'mousedown'/'click' so the
    // single click on the Save button after an idle period doesn't reset the timer and
    // mask an expired session — otherwise the save-after-idle case (EXC-006) could never
    // be blocked. Moving/typing/scrolling still keeps an active user signed in.
    const events: (keyof WindowEventMap)[] = ['keydown', 'mousemove', 'scroll', 'touchstart', 'wheel'];
    const handler = () => markActivity();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handler));
};
