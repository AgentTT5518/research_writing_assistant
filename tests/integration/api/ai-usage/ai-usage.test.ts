import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { aiUsage } from '@/db/schema';
import { nanoid } from 'nanoid';

// Mock db module
vi.mock('@/shared/lib/db', () => {
  const testDb = createTestDb();
  return { db: testDb };
});

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { db } from '@/shared/lib/db';
import { GET } from '@/app/api/ai-usage/route';

function seedUsage(feature: string, costUsd: number, promptTokens: number, completionTokens: number, createdAt: Date) {
  db.insert(aiUsage).values({
    id: nanoid(),
    feature,
    operation: 'test',
    model: 'claude-3-opus',
    promptTokens,
    completionTokens,
    estimatedCostUsd: costUsd,
    durationMs: 1000,
    createdAt,
  }).run();
}

describe('AI Usage API', () => {
  beforeEach(() => {
    db.delete(aiUsage).run();
  });

  it('returns empty usage when no data exists', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.usage).toEqual([]);
    expect(data.totals.totalRequests).toBe(0);
    expect(data.totals.totalCostUsd).toBe(0);
  });

  it('aggregates usage by feature and month', async () => {
    const march = new Date('2026-03-15T12:00:00Z');
    const february = new Date('2026-02-10T12:00:00Z');

    seedUsage('research', 0.01, 100, 50, march);
    seedUsage('research', 0.02, 200, 100, march);
    seedUsage('write', 0.05, 500, 250, march);
    seedUsage('research', 0.03, 300, 150, february);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.usage).toHaveLength(3); // 2 features in March + 1 in Feb

    // Most recent month first
    const marchResearch = data.usage.find(
      (r: { feature: string; month: string }) => r.feature === 'research' && r.month === '2026-03'
    );
    expect(marchResearch).toBeDefined();
    expect(marchResearch.totalRequests).toBe(2);
    expect(marchResearch.totalPromptTokens).toBe(300);
    expect(marchResearch.totalCompletionTokens).toBe(150);
    expect(marchResearch.totalCostUsd).toBeCloseTo(0.03, 4);
  });

  it('computes correct grand totals', async () => {
    const date = new Date('2026-03-15T12:00:00Z');
    seedUsage('research', 0.01, 100, 50, date);
    seedUsage('write', 0.05, 500, 250, date);
    seedUsage('review', 0.03, 300, 150, date);

    const res = await GET();
    const data = await res.json();

    expect(data.totals.totalRequests).toBe(3);
    expect(data.totals.totalPromptTokens).toBe(900);
    expect(data.totals.totalCompletionTokens).toBe(450);
    expect(data.totals.totalCostUsd).toBeCloseTo(0.09, 4);
  });

  it('handles null token values gracefully', async () => {
    // Insert with null tokens
    db.insert(aiUsage).values({
      id: nanoid(),
      feature: 'research',
      operation: 'test',
      model: 'claude-3-opus',
      promptTokens: null,
      completionTokens: null,
      estimatedCostUsd: null,
      durationMs: null,
      createdAt: new Date('2026-03-15T12:00:00Z'),
    }).run();

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.usage).toHaveLength(1);
    expect(data.usage[0].totalPromptTokens).toBe(0);
    expect(data.usage[0].totalCostUsd).toBe(0);
  });
});
