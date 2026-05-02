import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { replayIntegration } from '@sentry/browser';

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Call as early as possible in the application lifecycle (e.g. from `main.tsx`).
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

  if (!dsn) {
    if (import.meta.env.PROD) {
      console.warn('Sentry DSN not configured. Error tracking disabled.');
    }
    return;
  }

  const isDev = import.meta.env.DEV;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    enabled: !isDev,

    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    maxBreadcrumbs: 50,
    attachStacktrace: true,

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /graph\.facebook\.com/i,
      /connect\.facebook\.net/i,
      /cdn\.segment\.com/i,
    ],

    beforeSend(event, hint) {
      if (event.exception) {
        const error = hint.originalException as Error | undefined;
        if (error?.message?.includes('ResizeObserver')) {
          return null;
        }
      }
      return event;
    },
  });
};

/**
 * Wrapper for Sentry.captureException that provides additional context
 */
export const captureException = (error: Error, context?: Record<string, unknown>) => {
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
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) => {
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
  data?: Record<string, unknown>
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
 * Start a manual span (replaces legacy `startTransaction` in SDK v8+).
 */
export const startTransaction = (name: string, op: string = 'custom') => {
  return Sentry.startInactiveSpan({ name, op });
};

export default Sentry;
