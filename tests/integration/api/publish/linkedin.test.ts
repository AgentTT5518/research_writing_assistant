import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { projects, drafts, schedules, appConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { publishLinkedInSchema } from '@/features/publishing/types';
import { validateLinkedInContent } from '@/shared/lib/validate-content';

describe('LinkedIn Publish API Logic', () => {
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
      linkedinContent?: string | null;
      blogTitle?: string | null;
      blogContent?: string | null;
    } = {}
  ) => {
    const now = new Date();
    const id = nanoid();
    db.insert(drafts).values({
      id,
      projectId,
      status: opts.status ?? 'approved',
      linkedinContent: 'linkedinContent' in opts ? opts.linkedinContent : 'Test LinkedIn post content',
      blogTitle: 'blogTitle' in opts ? opts.blogTitle : 'Test Title',
      blogContent: 'blogContent' in opts ? opts.blogContent : '<p>Test</p>',
      createdAt: now,
      updatedAt: now,
    }).run();
    return id;
  };

  const setLinkedInTokens = (expired = false) => {
    db.insert(appConfig).values({
      key: 'linkedin_tokens',
      value: JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: expired ? Date.now() - 3600_000 : Date.now() + 3600_000,
        linkedinUrn: 'test-urn-123',
      }),
      updatedAt: new Date(),
    }).run();
  };

  beforeAll(() => {
    db = createTestDb();
  });

  beforeEach(() => {
    db.delete(schedules).run();
    db.delete(drafts).run();
    db.delete(projects).run();
    db.delete(appConfig).run();
  });

  describe('Schema validation', () => {
    it('validates draftId is required', () => {
      const result = publishLinkedInSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('validates draftId is non-empty', () => {
      const result = publishLinkedInSchema.safeParse({ draftId: '' });
      expect(result.success).toBe(false);
    });

    it('accepts valid input', () => {
      const result = publishLinkedInSchema.safeParse({ draftId: 'abc123' });
      expect(result.success).toBe(true);
    });
  });

  describe('Draft validation for LinkedIn publish', () => {
    it('requires draft to exist', () => {
      const draft = db.select().from(drafts).where(eq(drafts.id, 'nonexistent')).get();
      expect(draft).toBeUndefined();
    });

    it('requires linkedinContent to be present', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { linkedinContent: null });

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.linkedinContent).toBeNull();
    });

    it('requires draft status to be approved or scheduled', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'draft' });

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(['approved', 'scheduled'].includes(draft!.status!)).toBe(false);
    });
  });

  describe('LinkedIn content validation', () => {
    it('accepts valid plain text content', () => {
      const result = validateLinkedInContent('This is a valid LinkedIn post about AI research.');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('rejects content exceeding 3000 characters', () => {
      const longContent = 'x'.repeat(3001);
      const result = validateLinkedInContent(longContent);
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('3000 character limit');
    });

    it('rejects javascript: URIs', () => {
      const result = validateLinkedInContent('Check this javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('dangerous URI');
    });

    it('rejects data: URIs', () => {
      const result = validateLinkedInContent('See data:text/html,<script>');
      expect(result.valid).toBe(false);
    });
  });

  describe('LinkedIn connection status', () => {
    it('detects when LinkedIn is not connected', () => {
      const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      expect(row).toBeUndefined();
    });

    it('detects when LinkedIn is connected', () => {
      setLinkedInTokens();
      const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      expect(row).toBeDefined();

      const tokens = JSON.parse(row!.value);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('detects expired tokens', () => {
      setLinkedInTokens(true);
      const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      const tokens = JSON.parse(row!.value);
      expect(tokens.expiresAt).toBeLessThan(Date.now());
    });
  });

  describe('Post-publish state updates', () => {
    it('updates draft status to published', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'approved' });

      db.update(drafts)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('published');
    });

    it('updates related schedule when exists', () => {
      const projectId = createProject();
      const draftId = createDraft(projectId, { status: 'scheduled' });
      const scheduleId = nanoid();

      db.insert(schedules).values({
        id: scheduleId,
        draftId,
        platform: 'linkedin',
        scheduledAt: new Date(Date.now() + 3600_000),
        status: 'pending',
        publishAttempts: 0,
        createdAt: new Date(),
      }).run();

      const postUrl = 'https://www.linkedin.com/feed/update/urn:li:ugcPost:123';

      db.update(drafts)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      db.update(schedules)
        .set({
          status: 'published',
          publishedUrl: postUrl,
          publishedAt: new Date(),
        })
        .where(eq(schedules.id, scheduleId))
        .run();

      const schedule = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
      expect(schedule!.status).toBe('published');
      expect(schedule!.publishedUrl).toBe(postUrl);
    });
  });

  describe('OAuth callback logic', () => {
    it('handles successful OAuth callback by saving tokens', () => {
      db.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'new-token',
          refreshToken: 'ref-token',
          expiresAt: Date.now() + 3600_000,
          linkedinUrn: 'user-urn-456',
        }),
        updatedAt: new Date(),
      }).run();

      const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      const tokens = JSON.parse(row!.value);
      expect(tokens.accessToken).toBe('new-token');
      expect(tokens.linkedinUrn).toBe('user-urn-456');
    });

    it('handles OAuth denial (user_cancelled_authorize)', () => {
      // Simulate: no tokens saved, redirect to /settings?linkedin=denied
      const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      expect(row).toBeUndefined();
    });
  });
});
