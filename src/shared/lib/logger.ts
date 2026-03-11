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

interface ErrorOptions {
  error?: Error;
  context?: Record<string, unknown>;
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
  error: (feature: string, message: string, errorOrOpts?: Error | ErrorOptions, context?: Record<string, unknown>) => {
    // Support both: logger.error('f', 'm', err) and logger.error('f', 'm', { error, context })
    if (errorOrOpts instanceof Error) {
      return createLog('error', feature, message, context, errorOrOpts);
    }
    const opts = errorOrOpts as ErrorOptions | undefined;
    return createLog('error', feature, message, opts?.context ?? context, opts?.error);
  },
  debug: (feature: string, message: string, context?: Record<string, unknown>) =>
    createLog('debug', feature, message, context),
};
