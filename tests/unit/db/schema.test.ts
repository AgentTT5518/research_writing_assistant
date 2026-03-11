import { describe, it, expect, beforeAll } from 'vitest';
import { createTestDb } from '../../helpers/test-db';
import { projects, researchItems, drafts, tags, schedules, aiUsage, appConfig } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

describe('Database Schema', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(() => {
    db = createTestDb();
  });

  it('creates and reads a project', () => {
    const id = nanoid();
    const now = new Date();
    db.insert(projects).values({
      id,
      name: 'Test Project',
      description: 'A test',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    const result = db.select().from(projects).where(eq(projects.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.name).toBe('Test Project');
    expect(result!.status).toBe('active');
  });

  it('cascades delete from project to research items', () => {
    const projectId = nanoid();
    const researchId = nanoid();
    const now = new Date();

    db.insert(projects).values({
      id: projectId,
      name: 'Cascade Test',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    db.insert(researchItems).values({
      id: researchId,
      projectId,
      sourceType: 'web',
      title: 'Research Item',
      createdAt: now,
    }).run();

    // Verify research item exists
    const before = db.select({ count: count() }).from(researchItems)
      .where(eq(researchItems.projectId, projectId)).get();
    expect(before!.count).toBe(1);

    // Delete project
    db.delete(projects).where(eq(projects.id, projectId)).run();

    // Research item should be cascade deleted
    const after = db.select({ count: count() }).from(researchItems)
      .where(eq(researchItems.projectId, projectId)).get();
    expect(after!.count).toBe(0);
  });

  it('cascades delete from project to drafts', () => {
    const projectId = nanoid();
    const draftId = nanoid();
    const now = new Date();

    db.insert(projects).values({
      id: projectId,
      name: 'Draft Cascade',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    db.insert(drafts).values({
      id: draftId,
      projectId,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }).run();

    db.delete(projects).where(eq(projects.id, projectId)).run();

    const after = db.select({ count: count() }).from(drafts)
      .where(eq(drafts.projectId, projectId)).get();
    expect(after!.count).toBe(0);
  });

  it('enforces unique tag names', () => {
    const id1 = nanoid();
    const id2 = nanoid();

    db.insert(tags).values({ id: id1, name: 'unique-tag' }).run();

    expect(() => {
      db.insert(tags).values({ id: id2, name: 'unique-tag' }).run();
    }).toThrow();
  });

  it('stores and retrieves app config as key-value', () => {
    const now = new Date();
    db.insert(appConfig).values({
      key: 'test_setting',
      value: JSON.stringify({ enabled: true }),
      updatedAt: now,
    }).run();

    const config = db.select().from(appConfig).where(eq(appConfig.key, 'test_setting')).get();
    expect(config).toBeDefined();
    expect(JSON.parse(config!.value)).toEqual({ enabled: true });
  });

  it('stores ai usage records', () => {
    const now = new Date();
    db.insert(aiUsage).values({
      id: nanoid(),
      feature: 'write',
      operation: 'draft',
      model: 'claude-sonnet-4-20250514',
      promptTokens: 500,
      completionTokens: 1000,
      estimatedCostUsd: 0.015,
      durationMs: 3200,
      createdAt: now,
    }).run();

    const records = db.select().from(aiUsage).all();
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].feature).toBe('write');
    expect(records[0].estimatedCostUsd).toBe(0.015);
  });

  it('stores schedule with correct status lifecycle', () => {
    const projectId = nanoid();
    const draftId = nanoid();
    const scheduleId = nanoid();
    const now = new Date();
    const scheduledAt = new Date(Date.now() + 86400000);

    db.insert(projects).values({
      id: projectId, name: 'Schedule Test', status: 'active', createdAt: now, updatedAt: now,
    }).run();

    db.insert(drafts).values({
      id: draftId, projectId, status: 'approved', createdAt: now, updatedAt: now,
    }).run();

    db.insert(schedules).values({
      id: scheduleId,
      draftId,
      platform: 'both',
      scheduledAt,
      status: 'pending',
      createdAt: now,
    }).run();

    const schedule = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
    expect(schedule!.platform).toBe('both');
    expect(schedule!.status).toBe('pending');
    expect(schedule!.publishAttempts).toBe(0);
  });
});
