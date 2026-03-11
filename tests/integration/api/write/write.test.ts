import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import {
  projects,
  researchItems,
  drafts,
  draftVersions,
  draftResearchLinks,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  generateDraftSchema,
  generateOutlineSchema,
  expandOutlineSchema,
  coWriteSchema,
  adaptContentSchema,
  reviewContentSchema,
} from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';

describe('Writing API Logic', () => {
  let db: ReturnType<typeof createTestDb>;
  const projectId = nanoid();
  const researchId1 = nanoid();
  const researchId2 = nanoid();

  beforeAll(() => {
    db = createTestDb();

    db.insert(projects)
      .values({
        id: projectId,
        name: 'Test Project',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    const now = new Date();
    db.insert(researchItems)
      .values([
        {
          id: researchId1,
          projectId,
          sourceType: 'web',
          title: 'AI in Healthcare',
          summary: 'AI is transforming healthcare through diagnostics.',
          url: 'https://example.com/ai-healthcare',
          content: 'Full article about AI in healthcare diagnostics...',
          createdAt: now,
        },
        {
          id: researchId2,
          projectId,
          sourceType: 'academic',
          title: 'Deep Learning Paper',
          summary: 'Deep learning advances in medical imaging.',
          createdAt: now,
        },
      ])
      .run();
  });

  beforeEach(() => {
    db.delete(draftResearchLinks).run();
    db.delete(draftVersions).run();
    db.delete(drafts).run();
  });

  // ─── Schema Validation ───

  describe('generateDraftSchema validation', () => {
    it('rejects missing required fields', () => {
      expect(generateDraftSchema.safeParse({}).success).toBe(false);
      expect(
        generateDraftSchema.safeParse({
          projectId: 'p1',
          researchItemIds: [],
          contentType: 'blog',
          writingMode: 'full_draft',
          topic: 'Test',
        }).success,
      ).toBe(false); // empty researchItemIds
    });

    it('accepts valid input', () => {
      const result = generateDraftSchema.safeParse({
        projectId: 'p1',
        researchItemIds: ['r1'],
        contentType: 'linkedin',
        writingMode: 'full_draft',
        topic: 'AI Ethics',
      });
      expect(result.success).toBe(true);
    });

    it('validates optional fields', () => {
      expect(
        generateDraftSchema.safeParse({
          projectId: 'p1',
          researchItemIds: ['r1'],
          contentType: 'blog',
          writingMode: 'full_draft',
          topic: 'Test',
          targetWordCount: 200, // below minimum 500
        }).success,
      ).toBe(false);

      expect(
        generateDraftSchema.safeParse({
          projectId: 'p1',
          researchItemIds: ['r1'],
          contentType: 'blog',
          writingMode: 'full_draft',
          topic: 'Test',
          targetWordCount: 2000,
        }).success,
      ).toBe(true);
    });
  });

  describe('adaptContentSchema validation', () => {
    it('validates from/to enums', () => {
      expect(
        adaptContentSchema.safeParse({ draftId: 'd1', from: 'twitter', to: 'blog' }).success,
      ).toBe(false);
    });

    it('accepts valid input', () => {
      expect(
        adaptContentSchema.safeParse({ draftId: 'd1', from: 'linkedin', to: 'blog' }).success,
      ).toBe(true);
    });
  });

  // ─── Research Validation ───

  describe('Research item validation', () => {
    it('verifies research items exist', () => {
      const existing = db
        .select()
        .from(researchItems)
        .where(eq(researchItems.id, researchId1))
        .get();
      expect(existing).toBeDefined();
      expect(existing!.title).toBe('AI in Healthcare');

      const missing = db
        .select()
        .from(researchItems)
        .where(eq(researchItems.id, 'nonexistent'))
        .get();
      expect(missing).toBeUndefined();
    });

    it('gathers research context from linked items', () => {
      const items = [researchId1, researchId2].map((rid) =>
        db.select().from(researchItems).where(eq(researchItems.id, rid)).get()!,
      );

      const researchNotes = items
        .map((r) => `## ${r.title}\n${r.summary ?? r.content ?? ''}`)
        .join('\n\n');

      expect(researchNotes).toContain('AI in Healthcare');
      expect(researchNotes).toContain('Deep Learning Paper');
    });
  });

  // ─── Prompt Composition ───

  describe('Prompt composition', () => {
    it('composes a draft prompt with correct temperature', () => {
      const prompt = composePrompt({
        operation: 'draft',
        contentType: 'linkedin',
        topic: 'AI Ethics',
        researchNotes: 'Some research',
      });

      expect(prompt.system).toBeTruthy();
      expect(prompt.user).toContain('AI Ethics');
      expect(prompt.temperature).toBe(0.75);
      expect(prompt.maxTokens).toBe(1024);
    });

    it('composes an outline prompt', () => {
      const prompt = composePrompt({
        operation: 'outline',
        contentType: 'blog',
        topic: 'Remote Work',
        researchNotes: 'Research notes here',
        dataPoints: 'Data points',
      });

      expect(prompt.temperature).toBe(0.45);
      expect(prompt.maxTokens).toBe(2048);
    });

    it('composes a review prompt with low temperature', () => {
      const prompt = composePrompt({
        operation: 'review',
        contentType: 'blog',
        draftContent: 'Some draft to review',
      });

      expect(prompt.temperature).toBe(0.3);
      expect(prompt.maxTokens).toBe(4096);
    });

    it('estimates tokens for pre-flight check', () => {
      const prompt = composePrompt({
        operation: 'draft',
        contentType: 'blog',
        topic: 'Test',
        researchNotes: 'x'.repeat(1000),
      });

      const tokens = estimateTokens(prompt);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });
  });

  // ─── Draft Status Transitions ───

  describe('Draft status transitions', () => {
    it('sets status to generating when starting draft', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'generating',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('generating');
    });

    it('transitions to draft status on completion', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'generating',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.update(drafts)
        .set({ status: 'draft', linkedinContent: 'Generated content', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('draft');
      expect(draft!.linkedinContent).toBe('Generated content');
    });

    it('transitions to failed on error', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'generating',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.update(drafts)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('failed');
    });

    it('transitions to reviewing and back to draft', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'Some content',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Set to reviewing
      db.update(drafts)
        .set({ status: 'reviewing', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      let draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('reviewing');

      // Back to draft with review results
      db.update(drafts)
        .set({
          status: 'draft',
          antiSlopScore: 85,
          antiSlopReport: JSON.stringify({ score: 85, suggestions: [] }),
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, draftId))
        .run();

      draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.status).toBe('draft');
      expect(draft!.antiSlopScore).toBe(85);
    });
  });

  // ─── Version Snapshots on Write Operations ───

  describe('Version snapshots for write operations', () => {
    it('creates version before adaptation', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'Original LinkedIn content',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Snapshot before adapt
      db.insert(draftVersions)
        .values({
          id: nanoid(),
          draftId,
          versionNumber: 1,
          linkedinContent: 'Original LinkedIn content',
          changeNote: 'Pre-adapt: linkedin → blog',
          createdAt: new Date(),
        })
        .run();

      // Simulate adaptation result
      db.update(drafts)
        .set({ blogContent: 'Adapted blog content', updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .all();
      expect(versions).toHaveLength(1);
      expect(versions[0].linkedinContent).toBe('Original LinkedIn content');

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
      expect(draft!.blogContent).toBe('Adapted blog content');
    });

    it('creates version before review', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          blogContent: 'Blog content to review',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftVersions)
        .values({
          id: nanoid(),
          draftId,
          versionNumber: 1,
          blogContent: 'Blog content to review',
          changeNote: 'Pre-review snapshot',
          createdAt: new Date(),
        })
        .run();

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .all();
      expect(versions).toHaveLength(1);
      expect(versions[0].changeNote).toBe('Pre-review snapshot');
    });

    it('creates initial version (v0) after draft generation', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'Generated content',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(draftVersions)
        .values({
          id: nanoid(),
          draftId,
          versionNumber: 0,
          linkedinContent: 'Generated content',
          changeNote: 'Initial AI generation',
          createdAt: new Date(),
        })
        .run();

      const versions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, draftId))
        .all();
      expect(versions).toHaveLength(1);
      expect(versions[0].versionNumber).toBe(0);
      expect(versions[0].changeNote).toBe('Initial AI generation');
    });
  });

  // ─── Content Adaptation Logic ───

  describe('Content adaptation logic', () => {
    it('reads source content (linkedin → blog)', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          linkedinContent: 'LinkedIn post content',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get()!;
      const from = 'linkedin';
      const sourceContent = from === 'linkedin' ? draft.linkedinContent : draft.blogContent;

      expect(sourceContent).toBe('LinkedIn post content');
    });

    it('returns error when source content is missing', () => {
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

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get()!;
      const sourceContent = draft.linkedinContent;
      expect(sourceContent).toBeNull();
    });
  });

  // ─── Review Logic ───

  describe('Review logic', () => {
    it('stores anti-slop report as JSON string', () => {
      const draftId = nanoid();
      const now = new Date();

      db.insert(drafts)
        .values({
          id: draftId,
          projectId,
          writingMode: 'full_draft',
          status: 'draft',
          blogContent: 'Draft to review',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const report = {
        score: 78,
        suggestions: [
          {
            line: '1',
            issue: 'Weak opening',
            original: 'In today\'s world',
            suggested: 'Modern healthcare faces',
            reason: 'Cliché opener',
          },
        ],
      };

      db.update(drafts)
        .set({
          antiSlopScore: report.score,
          antiSlopReport: JSON.stringify(report),
          status: 'draft',
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, draftId))
        .run();

      const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get()!;
      expect(draft.antiSlopScore).toBe(78);
      const storedReport = JSON.parse(draft.antiSlopReport!);
      expect(storedReport.suggestions).toHaveLength(1);
      expect(storedReport.suggestions[0].issue).toBe('Weak opening');
    });
  });
});
