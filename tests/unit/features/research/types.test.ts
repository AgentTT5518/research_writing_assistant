import { describe, it, expect } from 'vitest';
import {
  createResearchItemSchema,
  updateResearchItemSchema,
  webSearchSchema,
  urlScrapeSchema,
  academicSearchSchema,
} from '@/features/research/types';

describe('Research Types - Zod Schemas', () => {
  describe('createResearchItemSchema', () => {
    it('accepts valid research item data', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'web',
        title: 'Test Article',
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('requires projectId', () => {
      const result = createResearchItemSchema.safeParse({
        sourceType: 'web',
        title: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('requires sourceType', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        title: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('requires title', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'web',
      });
      expect(result.success).toBe(false);
    });

    it('validates sourceType enum', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'invalid',
        title: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('validates url format when provided', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'web',
        title: 'Test',
        url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional tagNames array', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'academic',
        title: 'Test Paper',
        tagNames: ['AI', 'ML'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tagNames).toEqual(['AI', 'ML']);
      }
    });

    it('validates reliabilityTier enum when provided', () => {
      const valid = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'web',
        title: 'Test',
        reliabilityTier: 'academic',
      });
      expect(valid.success).toBe(true);

      const invalid = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'web',
        title: 'Test',
        reliabilityTier: 'invalid_tier',
      });
      expect(invalid.success).toBe(false);
    });

    it('enforces title max length of 500', () => {
      const result = createResearchItemSchema.safeParse({
        projectId: 'proj-123',
        sourceType: 'web',
        title: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateResearchItemSchema', () => {
    it('accepts partial update with title only', () => {
      const result = updateResearchItemSchema.safeParse({ title: 'New Title' });
      expect(result.success).toBe(true);
    });

    it('accepts partial update with tagNames only', () => {
      const result = updateResearchItemSchema.safeParse({ tagNames: ['tag1'] });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateResearchItemSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates title min length when provided', () => {
      const result = updateResearchItemSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('webSearchSchema', () => {
    it('accepts valid search query', () => {
      const result = webSearchSchema.safeParse({
        query: 'machine learning',
        projectId: 'proj-123',
      });
      expect(result.success).toBe(true);
    });

    it('requires query', () => {
      const result = webSearchSchema.safeParse({ projectId: 'proj-123' });
      expect(result.success).toBe(false);
    });

    it('validates maxResults range', () => {
      const tooMany = webSearchSchema.safeParse({
        query: 'test',
        projectId: 'proj-123',
        maxResults: 25,
      });
      expect(tooMany.success).toBe(false);

      const valid = webSearchSchema.safeParse({
        query: 'test',
        projectId: 'proj-123',
        maxResults: 10,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('urlScrapeSchema', () => {
    it('accepts valid URL', () => {
      const result = urlScrapeSchema.safeParse({
        url: 'https://example.com/article',
        projectId: 'proj-123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = urlScrapeSchema.safeParse({
        url: 'not-a-url',
        projectId: 'proj-123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('academicSearchSchema', () => {
    it('accepts valid academic search', () => {
      const result = academicSearchSchema.safeParse({
        query: 'neural networks',
        projectId: 'proj-123',
        sources: ['arxiv', 'semantic_scholar'],
      });
      expect(result.success).toBe(true);
    });

    it('validates sources enum values', () => {
      const result = academicSearchSchema.safeParse({
        query: 'test',
        projectId: 'proj-123',
        sources: ['invalid_source'],
      });
      expect(result.success).toBe(false);
    });

    it('allows empty sources (defaults to both)', () => {
      const result = academicSearchSchema.safeParse({
        query: 'test',
        projectId: 'proj-123',
      });
      expect(result.success).toBe(true);
    });
  });
});
