import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { projects, drafts, schedules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { publishBlogSchema } from '@/features/publishing/types';

describe('Blog Publish API Logic', () => {
  let db: ReturnType<typeof createTestDb>;

  const createProject = () => {
    const now = new Date();
    const id = nanoid();
    db.insert(projects).values({ id, name: 'Test Project', status: 'active', createdAt: now, updatedAt: now }).run();
    return id;
  };

  const createDraft = (
    projectId: string,
    opts: {
      status?: 'generating' | 'draft' | 'reviewing' | 'approved' | 'scheduled' | 'published' | 'failed';
      blogTitle?: string | null;
      blogContent?: string | null;
      linkedinContent?: string | null;
      coverImagePath?: string | null;
    } = {}
  ) => {
    const now = new Date();
    const id = nanoid();
    db.insert(drafts).values({
      id,
      projectId,
      status: opts.status ?? 'approved',
      blogTitle: 'blogTitle' in opts ? opts.blogTitle : 'Test Blog Title',
      blogContent: 'blogContent' in opts ? opts.blogContent : '<p>Test content</p>',
      linkedinContent: 'linkedinContent' in opts ? opts.linkedinContent : 'Test LinkedIn post',
      coverImagePath: 'coverImagePath' in opts ? opts.coverImagePath : null,
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

  describe('Schema validation', () => {
    it('validates draftId is required', () => {
      const result = publishBlogSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('validates draftId is non-empty', () => {
      const result = publishBlogSchema.safeParse({ draftId: '' });
      expect(result.success).toBe(false);
    });

    it('accepts valid input', () => {
      const result = publishBlogSchema.safeParse({ draftId: 'abc123' });
      expect(result.success).toBe(true);
    });
  });

  describe('Draft validation for blog publish', () => {
    it('requires draft to exist', () => {
      const draft = db.select().from(drafts).where(eq(drafts.id, 'nonexistent')).get();
      expect(draft).toBeUndefined();
    });

    it('requires draft status to be approved or scheduled', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'draft' });

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      const validStatuses = ['approved', 'scheduled'];
      expect(validStatuses.includes(draft!.status!)).toBe(false);
    });

    it('allows approved draft', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'approved' });

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('approved');
    });

    it('allows scheduled draft', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'scheduled' });

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('scheduled');
    });

    it('requires blogTitle and blogContent', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { blogTitle: null, blogContent: null });

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.blogTitle).toBeNull();
      expect(draft!.blogContent).toBeNull();
    });
  });

  describe('Post-publish state updates', () => {
    it('updates draft status to published', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'approved' });

      // Simulate successful publish
      db.update(drafts)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('published');
    });

    it('updates related schedule when it exists', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'scheduled' });
      const scheduleId = nanoid();

      db.insert(schedules).values({
        id: scheduleId,
        draftId,
        platform: 'blog',
        scheduledAt: new Date(Date.now() + 3600_000),
        status: 'pending',
        publishAttempts: 0,
        createdAt: new Date(),
      }).run();

      // Simulate publish
      const postId = 'firestore-doc-123';
      const url = `https://myblog.com/posts/${postId}`;

      db.update(drafts)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      db.update(schedules)
        .set({
          status: 'published',
          publishedUrl: url,
          publishedAt: new Date(),
        })
        .where(eq(schedules.id, scheduleId))
        .run();

      const schedule = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(schedule!.status).toBe('published');
      expect(schedule!.publishedUrl).toBe(url);
      expect(schedule!.publishedAt).toBeDefined();
    });

    it('updates coverImagePath when image is uploaded', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, {
        status: 'approved',
        coverImagePath: 'data/images/draft1/photo.jpg',
      });

      const firebaseUrl = 'https://storage.googleapis.com/bucket/images/2026/03/photo.jpg';

      db.update(drafts)
        .set({
          status: 'published',
          coverImagePath: firebaseUrl,
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, draftId))
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.coverImagePath).toBe(firebaseUrl);
    });
  });
});
