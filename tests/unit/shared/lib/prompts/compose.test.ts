import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB and logger before imports
vi.mock('@/shared/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        }),
      }),
    }),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';

describe('Prompt Compose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('composePrompt', () => {
    it('assembles system prompt with base + anti-slop + ban list', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'linkedin',
        topic: 'AI testing',
        researchNotes: 'Some research',
        dataPoints: 'Some data',
      });

      expect(result.system).toContain('You are a writing assistant');
      expect(result.system).toContain('WRITING RULES (non-negotiable)');
      expect(result.system).toContain('BANNED TRANSITION WORDS');
      expect(result.system).toContain('BANNED ADJECTIVES');
    });

    it('builds LinkedIn draft prompt', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'linkedin',
        topic: 'AI testing',
        researchNotes: 'Research notes here',
        dataPoints: 'Data points here',
      });

      expect(result.user).toContain('LinkedIn post');
      expect(result.user).toContain('AI testing');
      expect(result.user).toContain('Research notes here');
    });

    it('builds blog draft prompt', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'blog',
        topic: 'Remote work',
        researchNotes: 'Notes',
        dataPoints: 'Data',
        sources: 'Source list',
      });

      expect(result.user).toContain('blog post');
      expect(result.user).toContain('Remote work');
      expect(result.user).toContain('Source list');
    });

    it('builds outline prompt', () => {
      const result = composePrompt({
        operation: 'outline',
        contentType: 'blog',
        topic: 'Machine Learning',
        researchNotes: 'Notes',
        dataPoints: 'Data',
      });

      expect(result.user).toContain('outline');
      expect(result.user).toContain('Machine Learning');
      expect(result.user).toContain('json');
    });

    it('builds co-write prompt', () => {
      const result = composePrompt({
        operation: 'co_write',
        contentType: 'blog',
        topic: 'Testing',
        researchNotes: 'Notes',
        existingDraft: 'Existing content here',
        coWriteAction: 'continue',
      });

      expect(result.user).toContain('co-writing partner');
      expect(result.user).toContain('Existing content here');
      expect(result.user).toContain('CONTINUE');
    });

    it('builds adaptation prompt', () => {
      const result = composePrompt({
        operation: 'adapt',
        contentType: 'linkedin',
        adaptDirection: 'blog_to_linkedin',
        originalContent: 'Blog content here',
      });

      expect(result.user).toContain('Adapt');
      expect(result.user).toContain('Blog content here');
      expect(result.user).toContain('Blog --> LinkedIn');
    });

    it('builds review prompt', () => {
      const result = composePrompt({
        operation: 'review',
        contentType: 'linkedin',
        draftContent: 'Content to review',
      });

      expect(result.user).toContain('Review');
      expect(result.user).toContain('Content to review');
      expect(result.user).toContain('score');
    });

    it('appends user instructions for draft operations', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'linkedin',
        topic: 'Test',
        researchNotes: 'Notes',
        dataPoints: 'Data',
        userInstructions: 'Focus on enterprise use cases',
      });

      expect(result.user).toContain('ADDITIONAL USER INSTRUCTIONS');
      expect(result.user).toContain('Focus on enterprise use cases');
    });
  });

  describe('temperature mapping', () => {
    it('uses correct temperature for LinkedIn draft', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'linkedin',
        topic: 'T',
        researchNotes: 'N',
        dataPoints: 'D',
      });
      expect(result.temperature).toBe(0.75);
    });

    it('uses correct temperature for blog draft', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'blog',
        topic: 'T',
        researchNotes: 'N',
        dataPoints: 'D',
      });
      expect(result.temperature).toBe(0.65);
    });

    it('uses correct temperature for outline', () => {
      const result = composePrompt({
        operation: 'outline',
        contentType: 'blog',
        topic: 'T',
        researchNotes: 'N',
        dataPoints: 'D',
      });
      expect(result.temperature).toBe(0.45);
    });

    it('uses correct temperature for co-write', () => {
      const result = composePrompt({
        operation: 'co_write',
        contentType: 'blog',
        topic: 'T',
        researchNotes: 'N',
        existingDraft: 'D',
        coWriteAction: 'continue',
      });
      expect(result.temperature).toBe(0.7);
    });

    it('uses correct temperature for review', () => {
      const result = composePrompt({
        operation: 'review',
        contentType: 'blog',
        draftContent: 'C',
      });
      expect(result.temperature).toBe(0.3);
    });
  });

  describe('max tokens mapping', () => {
    it('uses 1024 tokens for LinkedIn draft', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'linkedin',
        topic: 'T',
        researchNotes: 'N',
        dataPoints: 'D',
      });
      expect(result.maxTokens).toBe(1024);
    });

    it('uses 4096 tokens for blog draft', () => {
      const result = composePrompt({
        operation: 'draft',
        contentType: 'blog',
        topic: 'T',
        researchNotes: 'N',
        dataPoints: 'D',
      });
      expect(result.maxTokens).toBe(4096);
    });

    it('uses 2048 tokens for outline', () => {
      const result = composePrompt({
        operation: 'outline',
        contentType: 'blog',
        topic: 'T',
        researchNotes: 'N',
        dataPoints: 'D',
      });
      expect(result.maxTokens).toBe(2048);
    });
  });

  describe('estimateTokens', () => {
    it('estimates roughly 1 token per 4 characters', () => {
      const result = estimateTokens({
        system: 'a'.repeat(400),
        user: 'b'.repeat(400),
      });
      expect(result).toBe(200);
    });

    it('rounds up', () => {
      const result = estimateTokens({
        system: 'a'.repeat(5),
        user: 'b'.repeat(5),
      });
      expect(result).toBe(3); // ceil(10/4) = 3
    });
  });
});
