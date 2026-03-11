import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
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

import { getDefaultBanList, formatBanListForPrompt, loadBanList } from '@/shared/lib/prompts/ban-list';
import { db } from '@/shared/lib/db';

describe('Ban List', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDefaultBanList', () => {
    it('returns all four categories', () => {
      const banList = getDefaultBanList();
      expect(banList.transitionWords).toBeDefined();
      expect(banList.adjectives).toBeDefined();
      expect(banList.phrases).toBeDefined();
      expect(banList.structuralPatterns).toBeDefined();
    });

    it('includes known banned words', () => {
      const banList = getDefaultBanList();
      expect(banList.transitionWords).toContain('Indeed');
      expect(banList.transitionWords).toContain('Furthermore');
      expect(banList.adjectives).toContain('Robust');
      expect(banList.adjectives).toContain('Innovative');
    });

    it('has non-empty lists', () => {
      const banList = getDefaultBanList();
      expect(banList.transitionWords.length).toBeGreaterThan(5);
      expect(banList.adjectives.length).toBeGreaterThan(10);
      expect(banList.phrases.length).toBeGreaterThan(10);
      expect(banList.structuralPatterns.length).toBeGreaterThan(3);
    });
  });

  describe('formatBanListForPrompt', () => {
    it('formats all sections into prompt text', () => {
      const banList = getDefaultBanList();
      const formatted = formatBanListForPrompt(banList);

      expect(formatted).toContain('BANNED TRANSITION WORDS');
      expect(formatted).toContain('BANNED ADJECTIVES');
      expect(formatted).toContain('BANNED PHRASES');
      expect(formatted).toContain('BANNED STRUCTURAL PATTERNS');
    });

    it('wraps phrases in quotes', () => {
      const formatted = formatBanListForPrompt({
        transitionWords: [],
        adjectives: [],
        phrases: ['Test phrase'],
        structuralPatterns: [],
      });
      expect(formatted).toContain('"Test phrase"');
    });

    it('uses bullet points for structural patterns', () => {
      const formatted = formatBanListForPrompt({
        transitionWords: [],
        adjectives: [],
        phrases: [],
        structuralPatterns: ['Pattern one', 'Pattern two'],
      });
      expect(formatted).toContain('- Pattern one');
      expect(formatted).toContain('- Pattern two');
    });

    it('handles empty lists gracefully', () => {
      const formatted = formatBanListForPrompt({
        transitionWords: [],
        adjectives: [],
        phrases: [],
        structuralPatterns: [],
      });
      expect(formatted).toBe('');
    });
  });

  describe('loadBanList', () => {
    it('returns defaults when no DB entry exists', () => {
      const banList = loadBanList();
      expect(banList).toEqual(getDefaultBanList());
    });

    it('returns custom list from DB when available', () => {
      const customList = {
        transitionWords: ['Custom'],
        adjectives: ['Words'],
        phrases: ['Custom phrase'],
        structuralPatterns: ['Custom pattern'],
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({
              key: 'vocabulary_ban_list',
              value: JSON.stringify(customList),
              updatedAt: new Date(),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const banList = loadBanList();
      expect(banList).toEqual(customList);
    });

    it('falls back to defaults on invalid JSON', () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({
              key: 'vocabulary_ban_list',
              value: 'not-json',
              updatedAt: new Date(),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const banList = loadBanList();
      expect(banList).toEqual(getDefaultBanList());
    });
  });
});
