import { describe, it, expect } from 'vitest';
import {
  createDraftSchema,
  updateDraftSchema,
  generateDraftSchema,
  generateOutlineSchema,
  expandOutlineSchema,
  coWriteSchema,
  adaptContentSchema,
  reviewContentSchema,
} from '@/features/writing/types';

describe('Writing Types - Zod Schemas', () => {
  describe('createDraftSchema', () => {
    it('accepts valid draft data', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-123',
        writingMode: 'full_draft',
      });
      expect(result.success).toBe(true);
    });

    it('requires projectId', () => {
      const result = createDraftSchema.safeParse({
        writingMode: 'full_draft',
      });
      expect(result.success).toBe(false);
    });

    it('requires writingMode', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-123',
      });
      expect(result.success).toBe(false);
    });

    it('validates writingMode enum', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-123',
        writingMode: 'invalid_mode',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all writingMode values', () => {
      for (const mode of ['full_draft', 'outline_expand', 'co_writing']) {
        const result = createDraftSchema.safeParse({
          projectId: 'proj-123',
          writingMode: mode,
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts optional content fields', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-123',
        writingMode: 'full_draft',
        linkedinContent: 'Some content',
        blogTitle: 'My Post',
        blogContent: 'Full content here',
        blogExcerpt: 'Short excerpt',
        researchItemIds: ['res-1', 'res-2'],
      });
      expect(result.success).toBe(true);
    });

    it('allows null for optional content fields', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-123',
        writingMode: 'full_draft',
        linkedinContent: null,
        blogTitle: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects blogTitle exceeding 500 chars', () => {
      const result = createDraftSchema.safeParse({
        projectId: 'proj-123',
        writingMode: 'full_draft',
        blogTitle: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateDraftSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      const result = updateDraftSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates status enum', () => {
      const result = updateDraftSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('accepts all valid statuses', () => {
      for (const status of ['generating', 'draft', 'reviewing', 'approved', 'scheduled', 'published', 'failed']) {
        const result = updateDraftSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('validates antiSlopScore range', () => {
      expect(updateDraftSchema.safeParse({ antiSlopScore: -1 }).success).toBe(false);
      expect(updateDraftSchema.safeParse({ antiSlopScore: 101 }).success).toBe(false);
      expect(updateDraftSchema.safeParse({ antiSlopScore: 85 }).success).toBe(true);
    });

    it('accepts changeNote for version creation', () => {
      const result = updateDraftSchema.safeParse({ changeNote: 'Revised intro' });
      expect(result.success).toBe(true);
    });

    it('rejects changeNote exceeding 500 chars', () => {
      const result = updateDraftSchema.safeParse({ changeNote: 'x'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe('generateDraftSchema', () => {
    const validInput = {
      projectId: 'proj-123',
      researchItemIds: ['res-1'],
      contentType: 'linkedin',
      writingMode: 'full_draft',
      topic: 'AI in Healthcare',
    };

    it('accepts valid generation input', () => {
      const result = generateDraftSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('requires at least one research item', () => {
      const result = generateDraftSchema.safeParse({
        ...validInput,
        researchItemIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('validates contentType enum', () => {
      const result = generateDraftSchema.safeParse({
        ...validInput,
        contentType: 'twitter',
      });
      expect(result.success).toBe(false);
    });

    it('requires topic', () => {
      const result = generateDraftSchema.safeParse({
        ...validInput,
        topic: '',
      });
      expect(result.success).toBe(false);
    });

    it('validates optional linkedInPostType', () => {
      expect(
        generateDraftSchema.safeParse({ ...validInput, linkedInPostType: 'insight' }).success,
      ).toBe(true);
      expect(
        generateDraftSchema.safeParse({ ...validInput, linkedInPostType: 'invalid' }).success,
      ).toBe(false);
    });

    it('validates targetWordCount range', () => {
      expect(
        generateDraftSchema.safeParse({ ...validInput, targetWordCount: 499 }).success,
      ).toBe(false);
      expect(
        generateDraftSchema.safeParse({ ...validInput, targetWordCount: 5001 }).success,
      ).toBe(false);
      expect(
        generateDraftSchema.safeParse({ ...validInput, targetWordCount: 2000 }).success,
      ).toBe(true);
    });

    it('validates userInstructions max length', () => {
      const result = generateDraftSchema.safeParse({
        ...validInput,
        userInstructions: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('generateOutlineSchema', () => {
    it('accepts valid outline input', () => {
      const result = generateOutlineSchema.safeParse({
        projectId: 'proj-123',
        researchItemIds: ['res-1'],
        contentType: 'blog',
        topic: 'Remote Work Trends',
      });
      expect(result.success).toBe(true);
    });

    it('requires at least one research item', () => {
      const result = generateOutlineSchema.safeParse({
        projectId: 'proj-123',
        researchItemIds: [],
        contentType: 'blog',
        topic: 'Remote Work',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('expandOutlineSchema', () => {
    it('accepts valid expand input', () => {
      const result = expandOutlineSchema.safeParse({
        draftId: 'draft-123',
        sectionId: 'section-1',
        outline: 'Full outline text here',
      });
      expect(result.success).toBe(true);
    });

    it('requires draftId', () => {
      const result = expandOutlineSchema.safeParse({
        sectionId: 'section-1',
        outline: 'text',
      });
      expect(result.success).toBe(false);
    });

    it('requires sectionId', () => {
      const result = expandOutlineSchema.safeParse({
        draftId: 'draft-123',
        outline: 'text',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('coWriteSchema', () => {
    const validInput = {
      draftId: 'draft-123',
      action: 'continue',
      contentType: 'blog',
      existingDraft: 'Some draft content',
      topic: 'AI Ethics',
    };

    it('accepts valid co-write input', () => {
      const result = coWriteSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('validates action enum', () => {
      for (const action of ['continue', 'improve', 'suggest', 'transform']) {
        expect(coWriteSchema.safeParse({ ...validInput, action }).success).toBe(true);
      }
      expect(coWriteSchema.safeParse({ ...validInput, action: 'invalid' }).success).toBe(false);
    });

    it('requires existingDraft', () => {
      const result = coWriteSchema.safeParse({
        ...validInput,
        existingDraft: '',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional selection', () => {
      const result = coWriteSchema.safeParse({
        ...validInput,
        selection: 'Selected paragraph text',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adaptContentSchema', () => {
    it('accepts valid adaptation input', () => {
      const result = adaptContentSchema.safeParse({
        draftId: 'draft-123',
        from: 'blog',
        to: 'linkedin',
      });
      expect(result.success).toBe(true);
    });

    it('validates from/to enums', () => {
      expect(
        adaptContentSchema.safeParse({ draftId: 'd', from: 'twitter', to: 'blog' }).success,
      ).toBe(false);
    });

    it('validates optional targetWordCount', () => {
      expect(
        adaptContentSchema.safeParse({ draftId: 'd', from: 'linkedin', to: 'blog', targetWordCount: 99 }).success,
      ).toBe(false);
      expect(
        adaptContentSchema.safeParse({ draftId: 'd', from: 'linkedin', to: 'blog', targetWordCount: 2000 }).success,
      ).toBe(true);
    });
  });

  describe('reviewContentSchema', () => {
    it('accepts valid review input', () => {
      const result = reviewContentSchema.safeParse({ draftId: 'draft-123' });
      expect(result.success).toBe(true);
    });

    it('requires draftId', () => {
      const result = reviewContentSchema.safeParse({ draftId: '' });
      expect(result.success).toBe(false);
    });
  });
});
