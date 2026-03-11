import { z } from 'zod';
import type { Draft, DraftVersion } from '@/shared/types';

// ─── Content & Writing Enums ───

export type ContentType = 'linkedin' | 'blog';
export type WritingMode = 'full_draft' | 'outline_expand' | 'co_writing';
export type LinkedInPostType = 'insight' | 'story' | 'data_research';
export type CoWriteAction = 'continue' | 'improve' | 'suggest' | 'transform';
export type AdaptDirection = 'blog_to_linkedin' | 'linkedin_to_blog';

// ─── Prompt Input Interfaces ───

export interface LinkedInPromptInput {
  topic: string;
  researchNotes: string;
  dataPoints: string;
  authorContext?: string;
  postType?: LinkedInPostType;
}

export interface BlogPromptInput {
  topic: string;
  researchNotes: string;
  sources: string;
  dataPoints: string;
  authorContext?: string;
  targetWordCount?: number;
}

export interface OutlinePromptInput {
  contentType: ContentType;
  topic: string;
  researchNotes: string;
  dataPoints: string;
}

export interface CoWritePromptInput {
  contentType: ContentType;
  topic: string;
  researchNotes: string;
  existingDraft: string;
  action: CoWriteAction;
  selection?: string;
  userInstructions?: string;
}

export interface AdaptationPromptInput {
  direction: AdaptDirection;
  originalContent: string;
  targetWordCount?: number;
}

export interface AntiSlopReviewInput {
  draftContent: string;
  contentType: ContentType;
}

export interface ComposedPrompt {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}

export interface BanList {
  transitionWords: string[];
  adjectives: string[];
  phrases: string[];
  structuralPatterns: string[];
}

// ─── Output Types ───

export interface AntiSlopSuggestion {
  line: string;
  issue: string;
  original: string;
  suggested: string;
  reason: string;
}

export interface AntiSlopReport {
  score: number;
  suggestions: AntiSlopSuggestion[];
  revisedContent?: string;
}

export interface OutlineSection {
  id: string;
  heading: string;
  points: string[];
  sources: string[];
  openingLine: string;
  data?: string;
}

export interface Outline {
  thesis: string;
  sections: OutlineSection[];
  researchGaps: string[];
}

// ─── SSE Event Types ───

export interface SSEChunkEvent {
  content: string;
}

export interface SSEDoneEvent {
  draftId: string;
  tokensUsed: number;
  status: 'complete';
}

export interface SSEErrorEvent {
  code: string;
  message: string;
  partial: boolean;
}

// ─── Extended DB Types ───

export interface DraftWithVersions extends Draft {
  versions: DraftVersion[];
  researchItemIds: string[];
}

// ─── Zod Schemas ───

export const createDraftSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  writingMode: z.enum(['full_draft', 'outline_expand', 'co_writing']),
  linkedinContent: z.string().optional().nullable(),
  blogTitle: z.string().max(500).optional().nullable(),
  blogContent: z.string().optional().nullable(),
  blogExcerpt: z.string().max(500).optional().nullable(),
  researchItemIds: z.array(z.string()).optional(),
});

export const updateDraftSchema = z.object({
  linkedinContent: z.string().optional().nullable(),
  blogTitle: z.string().max(500).optional().nullable(),
  blogContent: z.string().optional().nullable(),
  blogExcerpt: z.string().max(500).optional().nullable(),
  status: z
    .enum(['generating', 'draft', 'reviewing', 'approved', 'scheduled', 'published', 'failed'])
    .optional(),
  coverImagePath: z.string().optional().nullable(),
  antiSlopScore: z.number().min(0).max(100).optional().nullable(),
  antiSlopReport: z.string().optional().nullable(),
  changeNote: z.string().max(500).optional(),
});

export const generateDraftSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  researchItemIds: z.array(z.string()).min(1, 'At least one research item is required'),
  contentType: z.enum(['linkedin', 'blog']),
  writingMode: z.enum(['full_draft', 'outline_expand', 'co_writing']),
  topic: z.string().min(1, 'Topic is required').max(500),
  linkedInPostType: z.enum(['insight', 'story', 'data_research']).optional(),
  targetWordCount: z.number().int().min(500).max(5000).optional(),
  userInstructions: z.string().max(2000).optional(),
  authorContext: z.string().max(1000).optional(),
});

export const generateOutlineSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  researchItemIds: z.array(z.string()).min(1, 'At least one research item is required'),
  contentType: z.enum(['linkedin', 'blog']),
  topic: z.string().min(1, 'Topic is required').max(500),
});

export const expandOutlineSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
  sectionId: z.string().min(1, 'Section ID is required'),
  outline: z.string().min(1, 'Outline is required'),
  userInstructions: z.string().max(2000).optional(),
});

export const coWriteSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
  action: z.enum(['continue', 'improve', 'suggest', 'transform']),
  contentType: z.enum(['linkedin', 'blog']),
  existingDraft: z.string().min(1, 'Existing draft content is required'),
  selection: z.string().optional(),
  topic: z.string().min(1, 'Topic is required').max(500),
  userInstructions: z.string().max(2000).optional(),
});

export const adaptContentSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
  from: z.enum(['linkedin', 'blog']),
  to: z.enum(['linkedin', 'blog']),
  targetWordCount: z.number().int().min(100).max(5000).optional(),
});

export const reviewContentSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
});

// ─── Inferred Types ───

export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type GenerateDraftInput = z.infer<typeof generateDraftSchema>;
export type GenerateOutlineInput = z.infer<typeof generateOutlineSchema>;
export type ExpandOutlineInput = z.infer<typeof expandOutlineSchema>;
export type CoWriteInput = z.infer<typeof coWriteSchema>;
export type AdaptContentInput = z.infer<typeof adaptContentSchema>;
export type ReviewContentInput = z.infer<typeof reviewContentSchema>;
