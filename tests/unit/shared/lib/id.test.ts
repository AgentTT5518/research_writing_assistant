import { describe, it, expect } from 'vitest';
import { generateId } from '@/shared/lib/id';

describe('generateId', () => {
  it('returns a string of default length 21', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(21);
  });

  it('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('respects custom size parameter', () => {
    const id = generateId(10);
    expect(id.length).toBe(10);
  });
});
