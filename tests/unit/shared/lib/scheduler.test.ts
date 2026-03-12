import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { projects, drafts, schedules } from '@/db/schema';
import { eq, and, lte, lt, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * These tests exercise the scheduler's core logic (queries and state transitions)
 * against an in-memory database. They don't test node-cron or the actual publish
 * functions, which are mocked / will be implemented in Phase 4b/4c.
 */

describe('Scheduler Logic', () => {
  let db: ReturnType<typeof createTestDb>;

  const createProject = () => {
    const now = new Date();
    const id = nanoid();
    db.insert(projects).values({ id, name: 'Test', status: 'active', createdAt: now, updatedAt: now }).run();
    return id;
  };

  const createDraft = (projectId: string) => {
    const now = new Date();
    const id = nanoid();
    db.insert(drafts).values({
      id, projectId, status: 'scheduled',
      blogTitle: 'Test', blogContent: '<p>Content</p>',
      linkedinContent: 'LinkedIn content',
      createdAt: now, updatedAt: now,
    }).run();
    return id;
  };

  const createSchedule = (
    draftId: string,
    overrides: Partial<{
      status: string;
      scheduledAt: Date;
      publishAttempts: number;
      lastAttemptAt: Date;
    }> = {}
  ) => {
    const id = nanoid();
    db.insert(schedules).values({
      id,
      draftId,
      platform: 'blog',
      scheduledAt: overrides.scheduledAt ?? new Date(Date.now() - 60_000), // past by default (due)
      status: (overrides.status ?? 'pending') as 'pending',
      publishAttempts: overrides.publishAttempts ?? 0,
      lastAttemptAt: overrides.lastAttemptAt ?? null,
      createdAt: new Date(),
    }).run();
    return id;
  };

  beforeAll(() => {
    db = createTestDb();
  });

  beforeEach(() => {
    db.delete(schedules).run();
    db.delete(drafts).run();
    db.delete(projects).run();
  });

  describe('queryDueJobs', () => {
    it('finds pending schedules with scheduledAt in the past', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      createSchedule(draftId, { scheduledAt: new Date(Date.now() - 60_000) });

      const now = new Date();
      const due = db.select().from(schedules).where(
        and(
          lte(schedules.scheduledAt, now),
          eq(schedules.status, 'pending')
        )
      ).all();

      expect(due).toHaveLength(1);
    });

    it('does not find future schedules', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      createSchedule(draftId, { scheduledAt: new Date(Date.now() + 3600_000) });

      const now = new Date();
      const due = db.select().from(schedules).where(
        and(
          lte(schedules.scheduledAt, now),
          eq(schedules.status, 'pending')
        )
      ).all();

      expect(due).toHaveLength(0);
    });

    it('finds failed schedules eligible for retry', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const retryGapMs = 5 * 60 * 1000;

      // Failed with 1 attempt, last attempt > 5 min ago (eligible for retry)
      createSchedule(draftId, {
        status: 'failed',
        publishAttempts: 1,
        lastAttemptAt: new Date(Date.now() - retryGapMs - 60_000),
      });

      const now = new Date();
      const retryCutoff = new Date(Date.now() - retryGapMs);

      const due = db.select().from(schedules).where(
        and(
          lte(schedules.scheduledAt, now),
          or(
            eq(schedules.status, 'pending'),
            and(
              eq(schedules.status, 'failed'),
              lt(schedules.publishAttempts, 3),
              lte(schedules.lastAttemptAt, retryCutoff)
            )
          )
        )
      ).all();

      expect(due).toHaveLength(1);
    });

    it('does not retry failed schedules with max attempts reached', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const retryGapMs = 5 * 60 * 1000;

      createSchedule(draftId, {
        status: 'failed',
        publishAttempts: 3, // max reached
        lastAttemptAt: new Date(Date.now() - retryGapMs - 60_000),
      });

      const now = new Date();
      const retryCutoff = new Date(Date.now() - retryGapMs);

      const due = db.select().from(schedules).where(
        and(
          lte(schedules.scheduledAt, now),
          or(
            eq(schedules.status, 'pending'),
            and(
              eq(schedules.status, 'failed'),
              lt(schedules.publishAttempts, 3),
              lte(schedules.lastAttemptAt, retryCutoff)
            )
          )
        )
      ).all();

      expect(due).toHaveLength(0);
    });

    it('does not retry failed schedules within retry gap', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const retryGapMs = 5 * 60 * 1000;

      createSchedule(draftId, {
        status: 'failed',
        publishAttempts: 1,
        lastAttemptAt: new Date(Date.now() - 60_000), // too recent
      });

      const now = new Date();
      const retryCutoff = new Date(Date.now() - retryGapMs);

      const due = db.select().from(schedules).where(
        and(
          lte(schedules.scheduledAt, now),
          or(
            eq(schedules.status, 'pending'),
            and(
              eq(schedules.status, 'failed'),
              lt(schedules.publishAttempts, 3),
              lte(schedules.lastAttemptAt, retryCutoff)
            )
          )
        )
      ).all();

      expect(due).toHaveLength(0);
    });
  });

  describe('recoverStuckJobs', () => {
    it('recovers jobs stuck in publishing for > 5 minutes', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const stuckTimeoutMs = 5 * 60 * 1000;

      // Stuck job: publishing status, last attempt > 5 min ago
      const scheduleId = createSchedule(draftId, {
        status: 'publishing',
        lastAttemptAt: new Date(Date.now() - stuckTimeoutMs - 60_000),
      });

      const cutoff = new Date(Date.now() - stuckTimeoutMs);
      const stuck = db.select({ id: schedules.id }).from(schedules).where(
        and(
          eq(schedules.status, 'publishing'),
          lte(schedules.lastAttemptAt, cutoff)
        )
      ).all();

      expect(stuck).toHaveLength(1);

      // Recover
      for (const job of stuck) {
        db.update(schedules).set({ status: 'pending' }).where(eq(schedules.id, job.id)).run();
      }

      const recovered = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(recovered!.status).toBe('pending');
    });

    it('does not recover recently started publishing jobs', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const stuckTimeoutMs = 5 * 60 * 1000;

      // Recently started: publishing status, last attempt < 5 min ago
      createSchedule(draftId, {
        status: 'publishing',
        lastAttemptAt: new Date(Date.now() - 60_000), // 1 min ago
      });

      const cutoff = new Date(Date.now() - stuckTimeoutMs);
      const stuck = db.select({ id: schedules.id }).from(schedules).where(
        and(
          eq(schedules.status, 'publishing'),
          lte(schedules.lastAttemptAt, cutoff)
        )
      ).all();

      expect(stuck).toHaveLength(0);
    });
  });

  describe('job processing state transitions', () => {
    it('transitions pending → publishing → published on success', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const scheduleId = createSchedule(draftId);

      // Simulate: mark as publishing
      const now = new Date();
      db.update(schedules).set({
        status: 'publishing',
        publishAttempts: 1,
        lastAttemptAt: now,
      }).where(eq(schedules.id, scheduleId)).run();

      let job = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(job!.status).toBe('publishing');

      // Simulate: publish success
      db.update(schedules).set({
        status: 'published',
        publishedAt: new Date(),
        publishedUrl: 'https://blog.com/posts/abc',
      }).where(eq(schedules.id, scheduleId)).run();

      db.update(drafts).set({ status: 'published', updatedAt: new Date() })
        .where(eq(drafts.id, draftId)).run();

      job = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(job!.status).toBe('published');
      expect(job!.publishedUrl).toBe('https://blog.com/posts/abc');

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('published');
    });

    it('transitions pending → publishing → failed on error', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId);
      const scheduleId = createSchedule(draftId);

      // Mark publishing
      db.update(schedules).set({
        status: 'publishing', publishAttempts: 1, lastAttemptAt: new Date(),
      }).where(eq(schedules.id, scheduleId)).run();

      // Simulate failure
      db.update(schedules).set({
        status: 'failed',
        errorMessage: 'Firebase connection timeout',
      }).where(eq(schedules.id, scheduleId)).run();

      const job = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(job!.status).toBe('failed');
      expect(job!.errorMessage).toBe('Firebase connection timeout');
      expect(job!.publishAttempts).toBe(1);
    });
  });
});
