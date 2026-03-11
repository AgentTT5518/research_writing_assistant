import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import {
  projects,
  researchItems,
  drafts,
  draftVersions,
  draftResearchLinks,
} from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createDraftSchema, updateDraftSchema } from '@/features/writing/types';

describe('Draft CRUD API Logic', () => {
  let db: ReturnType<typeof createTestDb>;
  const projectId = nanoid();
  const researchId1 = nanoid();
  const researchId2 = nanoid();

  beforeAll(() => {
    db = createTestDb();

    // Create a project for drafts to belong to
    db.insert(projects)
      .values({
        id: projectId,
        name: 'Test Project',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    // Create research items for linking
    const now = new Date();
    db.insert(researchItems)
      .values([
        { id: researchId1, projectId, sourceType: 'web', title: 'Research 1', createdAt: now },
        { id: researchId2, projectId, sourceType: 'academic', title: 'Research 2', createdAt: now },
      ])
      .run();
  });

  beforeEach(() => {
    // Clean draft-related tables between tests
    db.delete(draftResearchLinks).run();
    db.delete(draftVersions).run();
    db.delete(drafts).run();
  });

  // ─── Zod Schema Validation ───

  describe('createDraftSchema', () => {
    it('validates required fields', () => {
      expect(createDraftSchema.safeParse({}).success).toBe(false);
      expect(
        createDraftSchema.safeParse({ projectId: 'x' }).success,
      ).toBe(false);
      expect(
        createDraftSchema.safeParse({ writingMode: 'full_draft' }).success,
      ).toBe(false);
    });

    it('accepts valid input', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-1',
        writingMode: 'full_draft',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional researchItemIds', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-1',
        writingMode: 'full_draft',
        researchItemIds: ['r1', 'r2'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateDraftSchema', () => {
    it('accepts all optional fields', () => {
      expect(updateDraftSchema.safeParse({}).success).toBe(true);
    });

    it('validates status enum', () => {
      expect(updateDraftSchema.safeParse({ status: 'invalid' }).success).toBe(false);
      expect(updateDraftSchema.safeParse({ status: 'draft' }).success).toBe(true);
    });

    it('validates antiSlopScore range', () => {
      expect(updateDraftSchema.safeParse({ antiSlopScore: -1 }).success).toBe(false);
      expect(updateDraftSchema.safeParse({ antiSlopScore: 101 }).success).toBe(false);
      expect(updateDraftSchema.safeParse({ antiSlopScore: 50 }).success).toBe(true);
    });
  });

  // ─── GET (list) ───

  describe('GET /api/drafts (list)', () => {
    it('returns empty array when no drafts exist', () => {
      const result = db.select().from(drafts).orderBy(desc(drafts.updatedAt)).all();
      expect(result).toEqual([]);
    });

    it('returns drafts ordered by updatedAt descending', () => {
      const earlier = new Date(Date.now() - 60000);
      const later = new Date();

      db.insert(drafts)
        .values([
          {
            id: nanoid(),
            projectId,
            writingMode: 'full_draft',
            status: 'draft',
            createdAt: earlier,
            updatedAt: earlier,
          },
          {
            id: nanoid(),
            projectId,
            writingMode: 'co_writing',
            status: 'draft',
            createdAt: later,
            updatedAt: later,
          },
        ])
        .run();

      const result = db.select().from(drafts).orderBy(desc(drafts.updatedAt)).all();
      expect(result).toHaveLength(2);
      expect(result[0].writingMode).toBe('co_writing');
    });

    it('filters by projectId', () => {
      const otherProjectId = nanoid();
      const now = new Date();

      db.insert(projects)
        .values({ id: otherProjectId, name: 'Other', status: 'active', createdAt: now, updatedAt: now })
        .run();

      db.insert(drafts)
        .values([
          { id: nanoid(), projectId, writingMode: 'full_draft', status: 'draft', createdAt: now, updatedAt: now },
          { id: nanoid(), projectId: otherProjectId, writingMode: 'full_draft', status: 'draft', createdAt: now, updatedAt: now },
        ])
        .run();

      const result = db.select().from(drafts).where(eq(drafts.projectId, projectId)).all();
      expect(result).toHaveLength(1);
    });

    it('filters by status', () => {
      const now = new Date();

      db.insert(drafts)
        .values([
          { id: nanoid(), projectId, writingMode: 'full_draft', status: 'draft', createdAt: now, updatedAt: now },
          { id: nanoid(), projectId, writingMode: 'full_draft', status: 'approved', createdAt: now, updatedAt: now },
        ])
        .run();

      const result = db.select().from(drafts).where(eq(drafts.status, 'approved')).all();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('approved');
    });

    it('filters by writingMode', () => {
      const now = new Date();

      db.insert(drafts)
        .values([
          { id: nanoid(), projectId, writingMode: 'full_draft', status: 'draft', createdAt: now, updatedAt: now },
          { id: nanoid(), projectId, writingMode: 'outline_expand', status: 'draft', createdAt: now, updatedAt: now },
        ])
        .run();

      const result = db.select().from(drafts).where(eq(drafts.writingMode, 'outline_expand')).all();
      expect(result).toHaveLength(1);
      expect(result[0].writingMode).toBe('outline_expand');
    });
  });

  // ─── POST (create) ───

  describe('POST /api/drafts (create)', () => {
    it('creates a basic draft', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const stored = db.select().from(drafts).where(eq(drafts.id, id)).get();
      expect(stored).toBeDefined();
      expect(stored!.projectId).toBe(projectId);
      expect(stored!.writingMode).toBe('full_draft');
      expect(stored!.status).toBe('draft');
    });

    it('creates a draft with content fields', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'Test LinkedIn post',
          blogTitle: 'Test Blog',
          blogContent: '<p>Blog body</p>',
          blogExcerpt: 'Short excerpt',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const stored = db.select().from(drafts).where(eq(drafts.id, id)).get();
      expect(stored!.linkedinContent).toBe('Test LinkedIn post');
      expect(stored!.blogTitle).toBe('Test Blog');
      expect(stored!.blogContent).toBe('<p>Blog body</p>');
      expect(stored!.blogExcerpt).toBe('Short excerpt');
    });

    it('creates draft with research item links', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftResearchLinks)
        .values([
          { draftId, researchItemId: researchId1 },
          { draftId, researchItemId: researchId2 },
        ])
        .run();

      const links = db
        .select({ researchItemId: draftResearchLinks.researchItemId })
        .from(draftResearchLinks)
        .where(eq(draftResearchLinks.draftId, draftId))
        .all();

      expect(links).toHaveLength(2);
      expect(links.map((l) => l.researchItemId).sort()).toEqual(
        [researchId1, researchId2].sort(),
      );
    });
  });

  // ─── GET /api/drafts/[id] (detail) ───

  describe('GET /api/drafts/[id] (detail)', () => {
    it('returns draft with versions and research links', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'Content v1',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftVersions)
        .values({
          id: nanoid(),
          draftId,
          versionNumber: 1,
          linkedinContent: 'Content v0',
          changeNote: 'Initial',
          createdAt: now,
        })
        .run();

      db.insert(draftResearchLinks)
        .values({ draftId, researchItemId: researchId1 })
        .run();

      // Fetch draft
      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft).toBeDefined();

      // Fetch versions
      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .orderBy(desc(draftVersions.versionNumber))
        .limit(20)
        .all();
      expect(versions).toHaveLength(1);
      expect(versions[0].changeNote).toBe('Initial');

      // Fetch research links
      const links = db
        .select({ researchItemId: draftResearchLinks.researchItemId })
        .from(draftResearchLinks)
        .where(eq(draftResearchLinks.draftId, draftId))
        .all();
      expect(links).toHaveLength(1);
      expect(links[0].researchItemId).toBe(researchId1);
    });

    it('returns undefined for nonexistent draft', () => {
      const result = db.select().from(drafts).where(eq(drafts.id, 'nonexistent')).get();
      expect(result).toBeUndefined();
    });
  });

  // ─── PUT /api/drafts/[id] (update) ───

  describe('PUT /api/drafts/[id] (update)', () => {
    it('updates content fields', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.update(drafts)
        .set({
          linkedinContent: 'Updated content',
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, id))
        .run();

      const updated = db.select().from(drafts).where(eq(drafts.id, id)).get();
      expect(updated!.linkedinContent).toBe('Updated content');
      expect(updated!.status).toBe('approved');
    });

    it('creates version snapshot when changeNote provided', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'Original content',
          blogTitle: 'Original title',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Simulate version creation (as the PUT route does)
      const existingDraft = db.select().from(drafts).where(eq(drafts.id, draftId)).get()!;
      db.insert(draftVersions)
        .values({
          id: nanoid(),
          draftId,
          versionNumber: 1,
          linkedinContent: existingDraft.linkedinContent,
          blogTitle: existingDraft.blogTitle,
          blogContent: existingDraft.blogContent,
          blogExcerpt: existingDraft.blogExcerpt,
          changeNote: 'First revision',
          createdAt: new Date(),
        })
        .run();

      // Update the draft
      db.update(drafts)
        .set({ linkedinContent: 'Revised content', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      // Verify version was saved
      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .all();
      expect(versions).toHaveLength(1);
      expect(versions[0].linkedinContent).toBe('Original content');
      expect(versions[0].changeNote).toBe('First revision');

      // Verify draft was updated
      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.linkedinContent).toBe('Revised content');
    });

    it('increments version numbers correctly', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Create 3 versions
      for (let i = 1; i <= 3; i++) {
        db.insert(draftVersions)
          .values({
            id: nanoid(),
            draftId,
            versionNumber: i,
            changeNote: `Version ${i}`,
            createdAt: new Date(),
          })
          .run();
      }

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .orderBy(desc(draftVersions.versionNumber))
        .all();

      expect(versions).toHaveLength(3);
      expect(versions[0].versionNumber).toBe(3);
      expect(versions[1].versionNumber).toBe(2);
      expect(versions[2].versionNumber).toBe(1);
    });

    it('prunes versions beyond MAX_VERSIONS (20)', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Create 22 versions
      for (let i = 1; i <= 22; i++) {
        db.insert(draftVersions)
          .values({
            id: nanoid(),
            draftId,
            versionNumber: i,
            changeNote: `Version ${i}`,
            createdAt: new Date(),
          })
          .run();
      }

      // Prune: keep only latest 20
      const allVersions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .orderBy(asc(draftVersions.versionNumber))
        .all();

      expect(allVersions).toHaveLength(22);

      const MAX_VERSIONS = 20;
      if (allVersions.length > MAX_VERSIONS) {
        const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS);
        for (const v of toDelete) {
          db.delete(draftVersions).where(eq(draftVersions.id, v.id)).run();
        }
      }

      const remaining = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .orderBy(asc(draftVersions.versionNumber))
        .all();

      expect(remaining).toHaveLength(20);
      // Oldest versions (1, 2) should be deleted; 3-22 should remain
      expect(remaining[0].versionNumber).toBe(3);
      expect(remaining[remaining.length - 1].versionNumber).toBe(22);
    });

    it('updates antiSlopScore and antiSlopReport', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const report = JSON.stringify({ score: 85, suggestions: [] });
      db.update(drafts)
        .set({ antiSlopScore: 85, antiSlopReport: report, updatedAt: new Date() })
        .where(eq(drafts.id, id))
        .run();

      const updated = db.select().from(drafts).where(eq(drafts.id, id)).get();
      expect(updated!.antiSlopScore).toBe(85);
      expect(updated!.antiSlopReport).toBe(report);
    });
  });

  // ─── DELETE /api/drafts/[id] ───

  describe('DELETE /api/drafts/[id]', () => {
    it('deletes the draft', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.delete(drafts).where(eq(drafts.id, id)).run();

      const result = db.select().from(drafts).where(eq(drafts.id, id)).get();
      expect(result).toBeUndefined();
    });

    it('cascades to versions', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftVersions)
        .values({
          id: nanoid(),
          draftId,
          versionNumber: 1,
          changeNote: 'v1',
          createdAt: now,
        })
        .run();

      // Delete draft — should cascade to versions
      db.delete(drafts).where(eq(drafts.id, draftId)).run();

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .all();
      expect(versions).toHaveLength(0);
    });

    it('cascades to research links', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftResearchLinks)
        .values({ draftId, researchItemId: researchId1 })
        .run();

      // Delete draft — should cascade to research links
      db.delete(drafts).where(eq(drafts.id, draftId)).run();

      const links = db
        .select()
        .from(draftResearchLinks)
        .where(eq(draftResearchLinks.draftId, draftId))
        .all();
      expect(links).toHaveLength(0);

      // Research item itself should still exist
      const research = db
        .select()
        .from(researchItems)
        .where(eq(researchItems.id, researchId1))
        .get();
      expect(research).toBeDefined();
    });
  });

  // ─── GET /api/drafts/[id]/versions ───

  describe('GET /api/drafts/[id]/versions', () => {
    it('returns versions ordered by versionNumber desc', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftVersions)
        .values([
          { id: nanoid(), draftId, versionNumber: 1, changeNote: 'v1', createdAt: now },
          { id: nanoid(), draftId, versionNumber: 2, changeNote: 'v2', createdAt: now },
          { id: nanoid(), draftId, versionNumber: 3, changeNote: 'v3', createdAt: now },
        ])
        .run();

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .orderBy(desc(draftVersions.versionNumber))
        .all();

      expect(versions).toHaveLength(3);
      expect(versions[0].versionNumber).toBe(3);
      expect(versions[0].changeNote).toBe('v3');
      expect(versions[2].versionNumber).toBe(1);
    });

    it('returns empty array for draft with no versions', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .all();
      expect(versions).toEqual([]);
    });
  });

  // ─── Image upload (route logic tests) ───

  describe('POST /api/drafts/[id]/image', () => {
    it('updates coverImagePath on draft', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const relativePath = `data/images/${draftId}/cover.png`;
      db.update(drafts)
        .set({ coverImagePath: relativePath, updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      const updated = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(updated!.coverImagePath).toBe(relativePath);
    });
  });
});
