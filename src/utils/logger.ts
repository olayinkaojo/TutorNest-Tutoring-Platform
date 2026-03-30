type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const isDev = import.meta.env.DEV;

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const REDACTED = '[REDACTED]';
  const sensitiveKeys = new Set([
    'password', 'token', 'accessToken', 'access_token',
    'refreshToken', 'refresh_token', 'secret', 'apiKey',
    'authorization', 'cookie', 'creditCard', 'cvv', 'cvc',
  ]);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      sensitiveKeys.has(k.toLowerCase()) ? REDACTED : v,
    ])
  );
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context: sanitize(context) } : {}),
  };

  if (isDev) {
    const fn = level === 'error' ? console.error
             : level === 'warn'  ? console.warn
             : level === 'debug' ? console.debug
             : console.info;
    fn(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context ?? '');
  } else {
    // In production, only log warn and error to keep the console clean.
    // Replace this with a real logging service (Sentry, LogRocket, etc.)
    if (level === 'warn' || level === 'error') {
      const fn = level === 'error' ? console.error : console.warn;
      fn(JSON.stringify(entry));
    }
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info:  (message: string, context?: Record<string, unknown>) => emit('info',  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => emit('warn',  message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
