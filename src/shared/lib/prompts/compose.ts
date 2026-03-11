import type {
  ComposedPrompt,
  BanList,
  ContentType,
  CoWriteAction,
  AdaptDirection,
  LinkedInPostType,
} from '@/features/writing/types';
import { getSystemBasePrompt } from './system-base';
import { getAntiSlopRules } from './anti-slop-rules';
import { loadBanList, formatBanListForPrompt } from './ban-list';
import { buildLinkedInPrompt } from './linkedin-post';
import { buildBlogPrompt } from './blog-post';
import { buildOutlinePrompt } from './outline';
import { buildCoWritePrompt } from './co-write';
import { buildAdaptationPrompt } from './adaptation';
import { buildAntiSlopReviewPrompt } from './anti-slop-review';

// ─── Types ───

export type WritingOperation = 'draft' | 'outline' | 'co_write' | 'adapt' | 'review';

export interface ComposePromptOptions {
  operation: WritingOperation;
  contentType: ContentType;
  topic?: string;
  researchNotes?: string;
  dataPoints?: string;
  sources?: string;
  authorContext?: string;
  existingDraft?: string;
  coWriteAction?: CoWriteAction;
  selection?: string;
  adaptDirection?: AdaptDirection;
  originalContent?: string;
  userInstructions?: string;
  linkedInPostType?: LinkedInPostType;
  targetWordCount?: number;
  banList?: BanList;
  draftContent?: string;
}

// ─── Temperature & Token Config ───

const TEMPERATURE_MAP: Record<string, number> = {
  'draft:linkedin': 0.75,
  'draft:blog': 0.65,
  'outline:linkedin': 0.45,
  'outline:blog': 0.45,
  'co_write:linkedin': 0.7,
  'co_write:blog': 0.7,
  'adapt:linkedin': 0.6,
  'adapt:blog': 0.6,
  'review:linkedin': 0.3,
  'review:blog': 0.3,
};

const MAX_TOKENS_MAP: Record<string, number> = {
  'draft:linkedin': 1024,
  'draft:blog': 4096,
  'outline:linkedin': 2048,
  'outline:blog': 2048,
  'co_write:linkedin': 1024,
  'co_write:blog': 1024,
  'adapt:linkedin': 1024,
  'adapt:blog': 4096,
  'review:linkedin': 4096,
  'review:blog': 4096,
};

// ─── Token Estimation ───

/**
 * Rough token estimate: ~4 chars per token.
 * Used for pre-flight check to avoid exceeding context window.
 */
export function estimateTokens(prompt: { system: string; user: string }): number {
  return Math.ceil((prompt.system.length + prompt.user.length) / 4);
}

// ─── Main Compose Function ───

export function composePrompt(options: ComposePromptOptions): ComposedPrompt {
  const banList = options.banList ?? loadBanList();

  // Build system message: base + anti-slop rules + ban list
  const systemParts = [
    getSystemBasePrompt(),
    '',
    getAntiSlopRules(),
    '',
    formatBanListForPrompt(banList),
  ];
  const system = systemParts.join('\n');

  // Build user message based on operation
  let user: string;

  switch (options.operation) {
    case 'draft':
      user = buildDraftPrompt(options);
      break;
    case 'outline':
      user = buildOutlinePrompt({
        contentType: options.contentType,
        topic: options.topic ?? '',
        researchNotes: options.researchNotes ?? '',
        dataPoints: options.dataPoints ?? '',
      });
      break;
    case 'co_write':
      user = buildCoWritePrompt({
        contentType: options.contentType,
        topic: options.topic ?? '',
        researchNotes: options.researchNotes ?? '',
        existingDraft: options.existingDraft ?? '',
        action: options.coWriteAction ?? 'continue',
        selection: options.selection,
        userInstructions: options.userInstructions,
      });
      break;
    case 'adapt':
      user = buildAdaptationPrompt({
        direction: options.adaptDirection ?? 'blog_to_linkedin',
        originalContent: options.originalContent ?? '',
        targetWordCount: options.targetWordCount,
      });
      break;
    case 'review':
      user = buildAntiSlopReviewPrompt({
        draftContent: options.draftContent ?? options.existingDraft ?? '',
        contentType: options.contentType,
      });
      break;
  }

  // Append user instructions if provided (for draft/outline/co_write)
  if (options.userInstructions && options.operation !== 'co_write') {
    user += `\n\nADDITIONAL USER INSTRUCTIONS:\n${options.userInstructions}`;
  }

  const key = `${options.operation}:${options.contentType}`;
  const temperature = TEMPERATURE_MAP[key] ?? 0.7;
  const maxTokens = MAX_TOKENS_MAP[key] ?? 2048;

  return { system, user, temperature, maxTokens };
}

// ─── Internal Helpers ───

function buildDraftPrompt(options: ComposePromptOptions): string {
  if (options.contentType === 'linkedin') {
    return buildLinkedInPrompt({
      topic: options.topic ?? '',
      researchNotes: options.researchNotes ?? '',
      dataPoints: options.dataPoints ?? '',
      authorContext: options.authorContext,
      postType: options.linkedInPostType,
    });
  }

  return buildBlogPrompt({
    topic: options.topic ?? '',
    researchNotes: options.researchNotes ?? '',
    sources: options.sources ?? '',
    dataPoints: options.dataPoints ?? '',
    authorContext: options.authorContext,
    targetWordCount: options.targetWordCount,
  });
}
