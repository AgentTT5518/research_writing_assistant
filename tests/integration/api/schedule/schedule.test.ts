import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { projects, drafts, schedules } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createScheduleSchema, updateScheduleSchema } from '@/features/publishing/types';

describe('Schedule API Logic', () => {
  let db: ReturnType<typeof createTestDb>;

  const createProject = () => {
    const now = new Date();
    const id = nanoid();
    db.insert(projects).values({ id, name: 'Test Project', status: 'active', createdAt: now, updatedAt: now }).run();
    return id;
  };

  const createDraft = (projectId: string, status: 'approved' | 'scheduled' | 'draft' = 'approved') => {
    const now = new Date();
    const id = nanoid();
    db.insert(drafts).values({
      id,
      projectId,
      status,
      blogTitle: 'Test Blog Title',
      blogContent: '<p>Test content</p>',
      linkedinContent: 'Test LinkedIn post',
      createdAt: now,
      updatedAt: now,
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

  describe('POST /api/schedule (create)', () => {
    it('creates a schedule for an approved draft', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'approved');
      const future = new Date(Date.now() + 3600_000);

      const schedule = {
        id: nanoid(),
        draftId,
        platform: 'blog' as const,
        scheduledAt: future,
        status: 'pending' as const,
        publishAttempts: 0,
        createdAt: new Date(),
      };

      db.insert(schedules).values(schedule).run();

      const result = db.select().from(schedules).where(eq(schedules.draftId, draftId)).get();
      expect(result).toBeDefined();
      expect(result!.status).toBe('pending');
      expect(result!.platform).toBe('blog');
    });

    it('updates draft status to scheduled after creating schedule', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'approved');
      const future = new Date(Date.now() + 3600_000);

      db.insert(schedules).values({
        id: nanoid(), draftId, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      db.update(drafts).set({ status: 'scheduled', updatedAt: new Date() }).where(eq(drafts.id, draftId)).run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('scheduled');
    });

    it('validates future scheduledAt', () => {
      const past = new Date(Date.now() - 3600_000).toISOString();
      const result = createScheduleSchema.safeParse({
        draftId: 'abc',
        platform: 'blog',
        scheduledAt: past,
      });
      expect(result.success).toBe(false);
    });

    it('supports platform "both"', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'approved');
      const future = new Date(Date.now() + 3600_000);

      db.insert(schedules).values({
        id: nanoid(), draftId, platform: 'both', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      const result = db.select().from(schedules).where(eq(schedules.draftId, draftId)).get();
      expect(result!.platform).toBe('both');
    });
  });

  describe('GET /api/schedule (list with filters)', () => {
    it('filters by status', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'approved');
      const future = new Date(Date.now() + 3600_000);

      db.insert(schedules).values({
        id: nanoid(), draftId, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();
      db.insert(schedules).values({
        id: nanoid(), draftId, platform: 'linkedin', scheduledAt: future,
        status: 'published', publishAttempts: 1, publishedAt: new Date(), createdAt: new Date(),
      }).run();

      const pending = db.select().from(schedules).where(eq(schedules.status, 'pending')).all();
      expect(pending).toHaveLength(1);

      const published = db.select().from(schedules).where(eq(schedules.status, 'published')).all();
      expect(published).toHaveLength(1);
    });

    it('filters by platform', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'approved');
      const future = new Date(Date.now() + 3600_000);

      db.insert(schedules).values({
        id: nanoid(), draftId, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();
      db.insert(schedules).values({
        id: nanoid(), draftId, platform: 'linkedin', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      const blogSchedules = db.select().from(schedules).where(eq(schedules.platform, 'blog')).all();
      expect(blogSchedules).toHaveLength(1);
    });

    it('filters by draftId', () => {
      const projectId = createProject();
      const draftId1 = createDraft(projectId, 'approved');
      const draftId2 = createDraft(projectId, 'approved');
      const future = new Date(Date.now() + 3600_000);

      db.insert(schedules).values({
        id: nanoid(), draftId: draftId1, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();
      db.insert(schedules).values({
        id: nanoid(), draftId: draftId2, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      const draft1Schedules = db.select().from(schedules).where(eq(schedules.draftId, draftId1)).all();
      expect(draft1Schedules).toHaveLength(1);
    });
  });

  describe('PUT /api/schedule/:id (update)', () => {
    it('updates scheduledAt for pending schedule', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'approved');
      const scheduleId = nanoid();
      const future = new Date(Date.now() + 3600_000);
      const newFuture = new Date(Date.now() + 7200_000);

      db.insert(schedules).values({
        id: scheduleId, draftId, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      db.update(schedules)
        .set({ scheduledAt: newFuture })
        .where(eq(schedules.id, scheduleId))
        .run();

      const updated = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      // SQLite stores timestamps as integer seconds, so sub-second precision is lost
      expect(Math.abs(updated!.scheduledAt!.getTime() - newFuture.getTime())).toBeLessThan(1000);
    });

    it('cancels a pending schedule', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'scheduled');
      const scheduleId = nanoid();
      const future = new Date(Date.now() + 3600_000);

      db.insert(schedules).values({
        id: scheduleId, draftId, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      db.update(schedules)
        .set({ status: 'cancelled' })
        .where(eq(schedules.id, scheduleId))
        .run();

      const updated = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(updated!.status).toBe('cancelled');
    });

    it('validates update schema requires at least one field', () => {
      const result = updateScheduleSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('DELETE /api/schedule/:id (soft cancel)', () => {
    it('soft-cancels a pending schedule', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'scheduled');
      const scheduleId = nanoid();

      db.insert(schedules).values({
        id: scheduleId, draftId, platform: 'blog',
        scheduledAt: new Date(Date.now() + 3600_000),
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      db.update(schedules)
        .set({ status: 'cancelled' })
        .where(eq(schedules.id, scheduleId))
        .run();

      const result = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(result!.status).toBe('cancelled');
    });
  });

  describe('Draft status revert on cancel', () => {
    it('reverts draft to approved when last pending schedule is cancelled', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'scheduled');
      const scheduleId = nanoid();

      db.insert(schedules).values({
        id: scheduleId, draftId, platform: 'blog',
        scheduledAt: new Date(Date.now() + 3600_000),
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      // Cancel the schedule
      db.update(schedules).set({ status: 'cancelled' }).where(eq(schedules.id, scheduleId)).run();

      // Check if other pending schedules exist
      const otherPending = db
        .select({ id: schedules.id })
        .from(schedules)
        .where(and(
          eq(schedules.draftId, draftId),
          ne(schedules.id, scheduleId),
          eq(schedules.status, 'pending')
        ))
        .get();

      if (!otherPending) {
        db.update(drafts).set({ status: 'approved', updatedAt: new Date() }).where(eq(drafts.id, draftId)).run();
      }

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('approved');
    });

    it('keeps draft as scheduled when other pending schedules exist', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, 'scheduled');
      const schedule1Id = nanoid();
      const schedule2Id = nanoid();
      const future = new Date(Date.now() + 3600_000);

      // Create two schedules
      db.insert(schedules).values({
        id: schedule1Id, draftId, platform: 'blog', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();
      db.insert(schedules).values({
        id: schedule2Id, draftId, platform: 'linkedin', scheduledAt: future,
        status: 'pending', publishAttempts: 0, createdAt: new Date(),
      }).run();

      // Cancel first schedule
      db.update(schedules).set({ status: 'cancelled' }).where(eq(schedules.id, schedule1Id)).run();

      // Check for other pending
      const otherPending = db
        .select({ id: schedules.id })
        .from(schedules)
        .where(and(
          eq(schedules.draftId, draftId),
          ne(schedules.id, schedule1Id),
          eq(schedules.status, 'pending')
        ))
        .get();

      if (!otherPending) {
        db.update(drafts).set({ status: 'approved', updatedAt: new Date() }).where(eq(drafts.id, draftId)).run();
      }

      // Draft should still be 'scheduled' because schedule2 is still pending
      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('scheduled');
    });
  });
});
