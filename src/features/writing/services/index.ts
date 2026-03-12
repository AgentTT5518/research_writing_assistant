export {
  fetchDrafts,
  fetchDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  fetchDraftVersions,
  uploadCoverImage,
  streamDraft,
  streamExpand,
  streamCoWrite,
  generateOutline,
  adaptContent,
  reviewDraftContent,
} from './writing-api';
export type { DraftFilters, StreamOptions } from './writing-api';

// research-context.ts is server-only (imports db/better-sqlite3).
// Import directly from './research-context' in API routes — not from this barrel.
export type { ResearchContext, ResearchContextItem } from './research-context';
