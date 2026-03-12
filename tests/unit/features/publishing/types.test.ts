import { describe, it, expect } from 'vitest';
import {
  createScheduleSchema,
  updateScheduleSchema,
  configUpdateSchema,
  publishBlogSchema,
  publishLinkedInSchema,
} from '@/features/publishing/types';

describe('createScheduleSchema', () => {
  it('accepts valid input', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const result = createScheduleSchema.safeParse({
      draftId: 'abc123',
      platform: 'blog',
      scheduledAt: future,
    });
    expect(result.success).toBe(true);
  });

  it('accepts platform "both"', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const result = createScheduleSchema.safeParse({
      draftId: 'abc123',
      platform: 'both',
      scheduledAt: future,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing draftId', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const result = createScheduleSchema.safeParse({ platform: 'blog', scheduledAt: future });
    expect(result.success).toBe(false);
  });

  it('rejects invalid platform', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const result = createScheduleSchema.safeParse({
      draftId: 'abc123',
      platform: 'twitter',
      scheduledAt: future,
    });
    expect(result.success).toBe(false);
  });

  it('rejects past scheduledAt', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    const result = createScheduleSchema.safeParse({
      draftId: 'abc123',
      platform: 'blog',
      scheduledAt: past,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date string', () => {
    const result = createScheduleSchema.safeParse({
      draftId: 'abc123',
      platform: 'blog',
      scheduledAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateScheduleSchema', () => {
  it('accepts scheduledAt update', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const result = updateScheduleSchema.safeParse({ scheduledAt: future });
    expect(result.success).toBe(true);
  });

  it('accepts status cancel', () => {
    const result = updateScheduleSchema.safeParse({ status: 'cancelled' });
    expect(result.success).toBe(true);
  });

  it('rejects empty object', () => {
    const result = updateScheduleSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = updateScheduleSchema.safeParse({ status: 'published' });
    expect(result.success).toBe(false);
  });
});

describe('configUpdateSchema', () => {
  it('accepts string value', () => {
    const result = configUpdateSchema.safeParse({ key: 'ai_model', value: 'claude-sonnet' });
    expect(result.success).toBe(true);
  });

  it('accepts object value', () => {
    const result = configUpdateSchema.safeParse({
      key: 'settings',
      value: { theme: 'dark' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts array value', () => {
    const result = configUpdateSchema.safeParse({
      key: 'ban_list',
      value: ['synergy', 'leverage'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty key', () => {
    const result = configUpdateSchema.safeParse({ key: '', value: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('publishBlogSchema', () => {
  it('accepts valid draftId', () => {
    const result = publishBlogSchema.safeParse({ draftId: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty draftId', () => {
    const result = publishBlogSchema.safeParse({ draftId: '' });
    expect(result.success).toBe(false);
  });
});

describe('publishLinkedInSchema', () => {
  it('accepts valid draftId', () => {
    const result = publishLinkedInSchema.safeParse({ draftId: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects missing draftId', () => {
    const result = publishLinkedInSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
