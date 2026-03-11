import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { parseAntiSlopReviewResponse, buildAntiSlopReviewPrompt } from '@/shared/lib/prompts/anti-slop-review';

describe('Anti-Slop Review', () => {
  describe('buildAntiSlopReviewPrompt', () => {
    it('builds review prompt for LinkedIn content', () => {
      const prompt = buildAntiSlopReviewPrompt({
        draftContent: 'Test content here',
        contentType: 'linkedin',
      });
      expect(prompt).toContain('LinkedIn post');
      expect(prompt).toContain('Test content here');
      expect(prompt).toContain('REVIEW CHECKLIST');
      expect(prompt).toContain('json');
    });

    it('builds review prompt for blog content', () => {
      const prompt = buildAntiSlopReviewPrompt({
        draftContent: 'Blog content',
        contentType: 'blog',
      });
      expect(prompt).toContain('blog post');
    });
  });

  describe('parseAntiSlopReviewResponse', () => {
    it('parses valid JSON in code fence', () => {
      const response = `Here's the review:

\`\`\`json
{
  "score": 82,
  "suggestions": [
    {
      "line": "paragraph 1",
      "issue": "banned word",
      "original": "robust framework",
      "suggested": "reliable framework",
      "reason": "robust is on the banned list"
    }
  ],
  "revisedContent": "Updated content"
}
\`\`\``;

      const result = parseAntiSlopReviewResponse(response);
      expect(result.score).toBe(82);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].original).toBe('robust framework');
      expect(result.revisedContent).toBe('Updated content');
    });

    it('parses JSON without code fence markers', () => {
      const response = JSON.stringify({
        score: 95,
        suggestions: [],
      });

      const result = parseAntiSlopReviewResponse(response);
      expect(result.score).toBe(95);
      expect(result.suggestions).toHaveLength(0);
    });

    it('clamps score to 0-100 range', () => {
      const response = '```json\n{"score": 150, "suggestions": []}\n```';
      const result = parseAntiSlopReviewResponse(response);
      expect(result.score).toBe(100);
    });

    it('clamps negative score to 0', () => {
      const response = '```json\n{"score": -10, "suggestions": []}\n```';
      const result = parseAntiSlopReviewResponse(response);
      expect(result.score).toBe(0);
    });

    it('limits suggestions to 5', () => {
      const suggestions = Array.from({ length: 8 }, (_, i) => ({
        line: `line ${i}`,
        issue: 'test',
        original: 'orig',
        suggested: 'sugg',
        reason: 'reason',
      }));

      const response = `\`\`\`json\n${JSON.stringify({ score: 70, suggestions })}\n\`\`\``;
      const result = parseAntiSlopReviewResponse(response);
      expect(result.suggestions).toHaveLength(5);
    });

    it('handles malformed response gracefully', () => {
      const result = parseAntiSlopReviewResponse('This is not JSON at all');
      expect(result.score).toBe(50);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].issue).toContain('parsing failed');
    });

    it('handles missing score with default', () => {
      const response = '```json\n{"suggestions": []}\n```';
      const result = parseAntiSlopReviewResponse(response);
      expect(result.score).toBe(50);
    });

    it('handles missing suggestions with empty array', () => {
      const response = '```json\n{"score": 85}\n```';
      const result = parseAntiSlopReviewResponse(response);
      expect(result.suggestions).toEqual([]);
    });

    it('omits revisedContent when not present', () => {
      const response = '```json\n{"score": 92, "suggestions": []}\n```';
      const result = parseAntiSlopReviewResponse(response);
      expect(result.revisedContent).toBeUndefined();
    });

    it('coerces suggestion fields to strings', () => {
      const response = `\`\`\`json
{
  "score": 75,
  "suggestions": [
    {
      "line": 3,
      "issue": null,
      "original": "text",
      "suggested": "better text",
      "reason": "improvement"
    }
  ]
}
\`\`\``;
      const result = parseAntiSlopReviewResponse(response);
      expect(typeof result.suggestions[0].line).toBe('string');
      expect(result.suggestions[0].issue).toBe('');
    });
  });
});
