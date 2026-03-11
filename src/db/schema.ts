import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ─── Projects ───
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'archived'] }).default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Research Items ───
export const researchItems = sqliteTable('research_items', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  sourceType: text('source_type', { enum: ['web', 'url', 'academic'] }).notNull(),
  title: text('title').notNull(),
  url: text('url'),
  content: text('content'),
  summary: text('summary'),
  authors: text('authors'), // JSON array string
  publishedDate: text('published_date'),
  reliabilityTier: text('reliability_tier', {
    enum: ['academic', 'industry_report', 'reputable_publication', 'blog_opinion', 'unknown'],
  }),
  metadata: text('metadata'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── Tags ───
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const researchItemTags = sqliteTable('research_item_tags', {
  researchItemId: text('research_item_id').references(() => researchItems.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
});

// ─── Drafts ───
export const drafts = sqliteTable('drafts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['generating', 'draft', 'reviewing', 'approved', 'scheduled', 'published', 'failed'],
  }).default('draft'),
  linkedinContent: text('linkedin_content'),
  blogTitle: text('blog_title'),
  blogContent: text('blog_content'),
  blogExcerpt: text('blog_excerpt'),
  coverImagePath: text('cover_image_path'),
  writingMode: text('writing_mode', { enum: ['full_draft', 'outline_expand', 'co_writing'] }),
  antiSlopScore: real('anti_slop_score'),
  antiSlopReport: text('anti_slop_report'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Draft Versions ───
export const draftVersions = sqliteTable('draft_versions', {
  id: text('id').primaryKey(),
  draftId: text('draft_id').references(() => drafts.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  linkedinContent: text('linkedin_content'),
  blogTitle: text('blog_title'),
  blogContent: text('blog_content'),
  blogExcerpt: text('blog_excerpt'),
  changeNote: text('change_note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── Draft ↔ Research Links ───
export const draftResearchLinks = sqliteTable('draft_research_links', {
  draftId: text('draft_id').references(() => drafts.id, { onDelete: 'cascade' }),
  researchItemId: text('research_item_id').references(() => researchItems.id, { onDelete: 'cascade' }),
});

// ─── Schedules ───
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  draftId: text('draft_id').references(() => drafts.id, { onDelete: 'cascade' }),
  platform: text('platform', { enum: ['linkedin', 'blog', 'both'] }).notNull(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  status: text('status', {
    enum: ['pending', 'publishing', 'published', 'failed', 'cancelled'],
  }).default('pending'),
  publishAttempts: integer('publish_attempts').default(0),
  lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp' }),
  publishedUrl: text('published_url'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
});

// ─── AI Usage Tracking ───
export const aiUsage = sqliteTable('ai_usage', {
  id: text('id').primaryKey(),
  feature: text('feature').notNull(),
  operation: text('operation'),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  estimatedCostUsd: real('estimated_cost_usd'),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── App Config (key-value store) ───
export const appConfig = sqliteTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
