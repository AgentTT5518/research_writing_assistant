import { z } from 'zod';
import type { Schedule, Draft, AppConfig } from '@/shared/types/database';

// ─── Zod Schemas ───

export const createScheduleSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
  platform: z.enum(['linkedin', 'blog', 'both']),
  scheduledAt: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date.getTime() > Date.now();
    },
    { message: 'scheduledAt must be a valid future ISO date string' }
  ),
});

export const updateScheduleSchema = z.object({
  scheduledAt: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date.getTime() > Date.now();
      },
      { message: 'scheduledAt must be a valid future ISO date string' }
    )
    .optional(),
  status: z.enum(['pending', 'cancelled']).optional(),
}).refine(
  (data) => data.scheduledAt !== undefined || data.status !== undefined,
  { message: 'At least one of scheduledAt or status must be provided' }
);

export const configUpdateSchema = z.object({
  key: z.string().min(1, 'Config key is required'),
  value: z.unknown(),
});

export const publishBlogSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
});

export const publishLinkedInSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
});

// ─── Types ───

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>;

export interface ScheduleWithDraft extends Schedule {
  draft: Pick<Draft, 'id' | 'blogTitle' | 'linkedinContent' | 'status' | 'projectId'> | null;
}

export interface PublishResult {
  postId: string;
  url?: string;
  platform: 'linkedin' | 'blog';
}

export interface LinkedInTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  linkedinUrn: string;
}

export interface EnvVarStatus {
  anthropic: boolean;
  tavily: boolean;
  firebase: boolean;
  linkedinClient: boolean;
}

export interface ConfigResponse {
  config: Record<string, unknown>;
  envStatus: EnvVarStatus;
  linkedinConnected: boolean;
  schedulerRunning: boolean;
}

export interface BlogPostData {
  title: string;
  content: string;
  excerpt?: string;
  author?: string;
  imageUrl?: string;
}
