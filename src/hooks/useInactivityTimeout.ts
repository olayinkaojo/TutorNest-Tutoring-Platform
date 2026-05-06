import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours
const STORAGE_KEY = 'tutornest_last_active';
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'] as const;

function getLastActive(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? parseInt(raw, 10) : Date.now();
}

function setLastActive() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export function useInactivityTimeout(onTimeout: () => void, enabled: boolean) {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const recordActivity = useCallback(() => setLastActive(), []);

  useEffect(() => {
    if (!enabled) return;

    // On mount: immediately sign out if the user was already inactive before returning
    const sinceLastActive = Date.now() - getLastActive();
    if (sinceLastActive > INACTIVITY_MS) {
      onTimeoutRef.current();
      return;
    }

    // Record activity on user interactions
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, recordActivity, { passive: true }));
    setLastActive();

    // Check every minute whether the threshold has been crossed
    const interval = setInterval(() => {
      const idle = Date.now() - getLastActive();
      if (idle > INACTIVITY_MS) {
        onTimeoutRef.current();
      }
    }, 60_000);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, recordActivity));
      clearInterval(interval);
    };
  }, [enabled, recordActivity]);
}
