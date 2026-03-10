// src/lib/logger.ts
// Structured logger — all production logging must go through this module.
// See CLAUDE.md Rule 3 for usage requirements.

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  feature: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

function createLog(
  level: LogLevel,
  feature: string,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    feature,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(error && {
      error: { name: error.name, message: error.message, stack: error.stack },
    }),
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }

  return entry;
}

export const logger = {
  info: (feature: string, message: string, context?: Record<string, unknown>) =>
    createLog('info', feature, message, context),
  warn: (feature: string, message: string, context?: Record<string, unknown>) =>
    createLog('warn', feature, message, context),
  error: (feature: string, message: string, error?: Error, context?: Record<string, unknown>) =>
    createLog('error', feature, message, context, error),
  debug: (feature: string, message: string, context?: Record<string, unknown>) =>
    createLog('debug', feature, message, context),
};

// Usage examples:
// logger.info('auth', 'User logged in', { userId: '123' })
// logger.error('payments', 'Stripe charge failed', error, { orderId: 'abc' })
// logger.warn('chat', 'Rate limit approaching', { remaining: 5 })
