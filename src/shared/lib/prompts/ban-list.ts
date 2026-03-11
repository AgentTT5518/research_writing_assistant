import { db } from '@/shared/lib/db';
import { appConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/shared/lib/logger';
import type { BanList } from '@/features/writing/types';

const BAN_LIST_CONFIG_KEY = 'vocabulary_ban_list';

export function getDefaultBanList(): BanList {
  return {
    transitionWords: [
      'Indeed', 'Furthermore', 'Moreover', 'Subsequently', 'Accordingly',
      'Thus', 'Consequently', 'Additionally', 'Notably', 'Therefore',
      'In terms of', 'Significantly', 'It is worth noting', 'In conclusion',
    ],
    adjectives: [
      'Robust', 'Innovative', 'Cutting-edge', 'Seamless', 'Comprehensive',
      'Dynamic', 'Transformative', 'Groundbreaking', 'Game-changer',
      'Next-generation', 'Best-in-class', 'Unprecedented', 'Scalable',
      'Agile', 'Holistic', 'Synergy', 'Leverage', 'Optimize', 'Streamline',
      'Elevate', 'Supercharge', 'Harness', 'Unleash', 'Unlock',
      'Future-proof', 'Spearhead',
    ],
    phrases: [
      'In today\'s fast-paced',
      'In a world where',
      'As the landscape continues to evolve',
      'Now more than ever',
      'Let\'s dive in',
      'Let\'s delve into',
      'Let\'s break it down',
      'It\'s no secret that',
      'At its core',
      'Revolutionize the way',
      'Unlock the power of',
      'Unlock the potential of',
      'Pave the way for',
      'At the forefront of',
      'Embark on a journey',
      'Push the boundaries of',
      'Bridging the gap between',
      'Foster a culture of',
      'Navigate the complexities of',
      'It is important to note that',
      'It is crucial to understand that',
      'It is essential to consider that',
      'Meet [solution]',
      'That\'s where [product] comes in',
      'Imagine a world where',
      'Thrilled to announce',
      'Whether you\'re a',
      'Here\'s the uncomfortable truth',
      'The goal?',
      'The result?',
      'The bottom line',
      'It\'s more than just',
      'Master the art of',
      'A testament to',
      'Stay ahead of the curve',
    ],
    structuralPatterns: [
      'Opening with a dictionary definition',
      'Three-item parallel lists in every paragraph',
      'Ending every section with a rhetorical question',
      'Binary contrasts ("It\'s not just X, it\'s Y")',
      'Dramatic sentence fragments for false emphasis',
      'The "mirror" closing that restates the opening',
    ],
  };
}

export function formatBanListForPrompt(banList: BanList): string {
  const sections: string[] = [];

  if (banList.transitionWords.length > 0) {
    sections.push(`BANNED TRANSITION WORDS: ${banList.transitionWords.join(', ')}`);
  }

  if (banList.adjectives.length > 0) {
    sections.push(`BANNED ADJECTIVES/BUZZWORDS: ${banList.adjectives.join(', ')}`);
  }

  if (banList.phrases.length > 0) {
    sections.push(`BANNED PHRASES: ${banList.phrases.map((p) => `"${p}"`).join(', ')}`);
  }

  if (banList.structuralPatterns.length > 0) {
    sections.push(`BANNED STRUCTURAL PATTERNS:\n${banList.structuralPatterns.map((p) => `- ${p}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

export function loadBanList(): BanList {
  try {
    const row = db
      .select()
      .from(appConfig)
      .where(eq(appConfig.key, BAN_LIST_CONFIG_KEY))
      .get();

    if (row) {
      const parsed = JSON.parse(row.value) as BanList;
      if (parsed.transitionWords && parsed.adjectives && parsed.phrases && parsed.structuralPatterns) {
        return parsed;
      }
    }
  } catch (err) {
    logger.warn('writing', 'Failed to load custom ban list, using defaults', {
      error: (err as Error).message,
    });
  }

  return getDefaultBanList();
}
