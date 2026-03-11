import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/shared/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('outputs structured JSON for info level', () => {
    const entry = logger.info('test-feature', 'Test message');
    expect(entry.level).toBe('info');
    expect(entry.feature).toBe('test-feature');
    expect(entry.message).toBe('Test message');
    expect(entry.timestamp).toBeDefined();
    expect(console.log).toHaveBeenCalledOnce();
  });

  it('outputs structured JSON for error level with error details', () => {
    const err = new Error('Something failed');
    const entry = logger.error('payments', 'Charge failed', err);
    expect(entry.level).toBe('error');
    expect(entry.error).toBeDefined();
    expect(entry.error?.name).toBe('Error');
    expect(entry.error?.message).toBe('Something failed');
    expect(entry.error?.stack).toBeDefined();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('includes context when provided', () => {
    const entry = logger.info('auth', 'Login', { userId: '123' });
    expect(entry.context).toEqual({ userId: '123' });
  });

  it('uses console.warn for warn level', () => {
    logger.warn('rate-limit', 'Approaching limit');
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('does not include context when not provided', () => {
    const entry = logger.debug('db', 'Query executed');
    expect(entry.context).toBeUndefined();
    expect(entry.error).toBeUndefined();
  });

  it('error accepts options object with both error and context', () => {
    const err = new Error('DB timeout');
    const entry = logger.error('db', 'Query failed', {
      error: err,
      context: { queryId: 'q-1' },
    });
    expect(entry.error?.message).toBe('DB timeout');
    expect(entry.context).toEqual({ queryId: 'q-1' });
  });

  it('error accepts Error instance directly (backward compat)', () => {
    const err = new Error('Oops');
    const entry = logger.error('api', 'Request failed', err);
    expect(entry.error?.message).toBe('Oops');
    expect(entry.context).toBeUndefined();
  });

  it('error accepts Error with separate context param', () => {
    const err = new Error('Timeout');
    const entry = logger.error('api', 'Slow query', err, { duration: 5000 });
    expect(entry.error?.message).toBe('Timeout');
    expect(entry.context).toEqual({ duration: 5000 });
  });
});
