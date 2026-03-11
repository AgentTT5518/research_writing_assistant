import { z } from 'zod';
import type { ResearchItem, Tag } from '@/shared/types';

// ─── Extended Types ───

export interface ResearchItemWithTags extends ResearchItem {
  tags: Tag[];
}

// ─── Zod Schemas ───

export const createResearchItemSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  sourceType: z.enum(['web', 'url', 'academic']),
  title: z.string().min(1, 'Title is required').max(500),
  url: z.string().url().optional().nullable(),
  content: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  authors: z.string().optional().nullable(), // JSON array string
  publishedDate: z.string().optional().nullable(),
  reliabilityTier: z
    .enum(['academic', 'industry_report', 'reputable_publication', 'blog_opinion', 'unknown'])
    .optional()
    .nullable(),
  metadata: z.string().optional().nullable(), // JSON string
  tagNames: z.array(z.string().min(1).max(100)).optional(),
});

export const updateResearchItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().optional().nullable(),
  reliabilityTier: z
    .enum(['academic', 'industry_report', 'reputable_publication', 'blog_opinion', 'unknown'])
    .optional()
    .nullable(),
  tagNames: z.array(z.string().min(1).max(100)).optional(),
});

export const webSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500),
  projectId: z.string().min(1, 'Project ID is required'),
  maxResults: z.number().int().min(1).max(20).optional(),
});

export const urlScrapeSchema = z.object({
  url: z.string().url('Valid URL is required'),
  projectId: z.string().min(1, 'Project ID is required'),
});

export const academicSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500),
  projectId: z.string().min(1, 'Project ID is required'),
  sources: z
    .array(z.enum(['semantic_scholar', 'arxiv']))
    .optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
});

export type CreateResearchItemInput = z.infer<typeof createResearchItemSchema>;
export type UpdateResearchItemInput = z.infer<typeof updateResearchItemSchema>;
export type WebSearchInput = z.infer<typeof webSearchSchema>;
export type UrlScrapeInput = z.infer<typeof urlScrapeSchema>;
export type AcademicSearchInput = z.infer<typeof academicSearchSchema>;
