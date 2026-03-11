import { describe, it, expect } from 'vitest';
import { createProjectSchema, updateProjectSchema } from '@/features/content-management/types';

describe('createProjectSchema', () => {
  it('accepts valid input', () => {
    const result = createProjectSchema.safeParse({
      name: 'AI Research',
      description: 'A research project',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without description', () => {
    const result = createProjectSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createProjectSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 200 chars', () => {
    const result = createProjectSchema.safeParse({ name: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('updateProjectSchema', () => {
  it('accepts partial updates', () => {
    const result = updateProjectSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts status change', () => {
    const result = updateProjectSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateProjectSchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (no changes)', () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
