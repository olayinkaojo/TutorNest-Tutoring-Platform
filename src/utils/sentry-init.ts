import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * This should be called as early as possible in the application lifecycle
 */
export const initSentry = () => {
  const isDev = import.meta.env.DEV;
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn && !isDev) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: dsn || '',
    environment: import.meta.env.MODE,
    enabled: !isDev, // Don't track errors in development
    
    // Performance Monitoring
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          typeof window !== 'undefined' ? window.location : null
        ),
      }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Additional configuration
    maxBreadcrumbs: 50,
    attachStacktrace: true,

    // Ignore certain errors
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      // Third-party scripts
      /graph\.facebook\.com/i,
      /connect\.facebook\.net/i,
      /cdn\.segment\.com/i,
    ],

    // Before send hook for filtering
    beforeSend(event, hint) {
      // Filter out specific errors if needed
      if (event.exception) {
        const error = hint.originalException as Error;
        if (error?.message?.includes('ResizeObserver')) {
          return null; // Don't send ResizeObserver errors
        }
      }
      return event;
    },
  });
};

/**
 * Wrapper for Sentry.captureException that provides additional context
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.captureException(error, {
      contexts: {
        extra: context,
      },
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Wrapper for Sentry.captureMessage
 */
export const captureMessage = (message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (userId: string, email?: string, username?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

/**
 * Clear user context when user logs out
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
  message: string,
  category: string = 'user-action',
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Start a performance transaction
 */
export const startTransaction = (name: string, op: string = 'operation') => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

export default Sentry;
