import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  projects,
  researchItems,
  tags,
  drafts,
  draftVersions,
  schedules,
  aiUsage,
  appConfig,
} from '@/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type InsertProject = InferInsertModel<typeof projects>;

export type ResearchItem = InferSelectModel<typeof researchItems>;
export type InsertResearchItem = InferInsertModel<typeof researchItems>;

export type Tag = InferSelectModel<typeof tags>;
export type InsertTag = InferInsertModel<typeof tags>;

export type Draft = InferSelectModel<typeof drafts>;
export type InsertDraft = InferInsertModel<typeof drafts>;

export type DraftVersion = InferSelectModel<typeof draftVersions>;
export type InsertDraftVersion = InferInsertModel<typeof draftVersions>;

export type Schedule = InferSelectModel<typeof schedules>;
export type InsertSchedule = InferInsertModel<typeof schedules>;

export type AiUsage = InferSelectModel<typeof aiUsage>;
export type InsertAiUsage = InferInsertModel<typeof aiUsage>;

export type AppConfig = InferSelectModel<typeof appConfig>;
export type InsertAppConfig = InferInsertModel<typeof appConfig>;
