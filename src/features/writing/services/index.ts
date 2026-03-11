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

export {
  buildResearchContext,
  buildResearchContextFromDraftLinks,
} from './research-context';
export type { ResearchContext, ResearchContextItem } from './research-context';
