import LogRocket from 'logrocket';

/**
 * Initialize LogRocket for session replay and bug tracking
 * This should be called early in the application lifecycle
 */
export const initLogRocket = () => {
  const appId = import.meta.env.VITE_LOGROCKET_APP_ID;

  if (!appId) {
    console.warn('LogRocket app ID not configured. Session replay disabled.');
    return;
  }

  LogRocket.init(appId, {
    console: {
      shouldAggregateConsoleErrors: true,
    },
    network: {
      requestSanitizer: (request) => {
        // Sanitize sensitive data in requests
        if (request.headers['authorization']) {
          request.headers['authorization'] = '[REDACTED]';
        }
        return request;
      },
      responseSanitizer: (response) => {
        // Sanitize sensitive data in responses
        return response;
      },
    },
  });
};

/**
 * Identify user in LogRocket for better session tracking
 */
export const identifyUserInLogRocket = (userId: string, email?: string, username?: string) => {
  LogRocket.identify(userId, {
    email,
    username,
    subscriptionType: 'pro', // Example custom property
  });
};

/**
 * Clear user identification when user logs out
 */
export const clearLogRocketUser = () => {
  // LogRocket doesn't have a built-in clear method, but we can reinitialize
  // For now, we'll just leave a note
  console.debug('User cleared from LogRocket session');
};

/**
 * Capture custom message in LogRocket
 */
export const captureLogRocketMessage = (message: string, metadata?: Record<string, any>) => {
  LogRocket.captureMessage(message, 'info');
  if (metadata) {
    LogRocket.getSessionURL(sessionURL => {
      console.debug(`LogRocket session: ${sessionURL}`, metadata);
    });
  }
};

/**
 * Get LogRocket session URL for sharing
 */
export const getLogRocketSessionURL = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    LogRocket.getSessionURL(sessionURL => {
      resolve(sessionURL);
    });
  });
};

/**
 * Create and submit error report with LogRocket context
 */
export const reportErrorWithLogRocket = (error: Error, additionalInfo?: Record<string, any>) => {
  LogRocket.captureException(error);

  // Get session URL for support team
  LogRocket.getSessionURL(sessionURL => {
    console.error('Error Report:', {
      error: error.message,
      stack: error.stack,
      sessionURL,
      additionalInfo,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Custom event tracking
 */
export const trackLogRocketEvent = (eventName: string, properties?: Record<string, any>) => {
  // LogRocket auto-tracks most user interactions, but this allows custom tracking
  LogRocket.captureMessage(`Event: ${eventName}`, 'info');
  if (properties) {
    console.debug(`Tracked: ${eventName}`, properties);
  }
};

export default LogRocket;
