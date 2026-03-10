# Feature Boundary: Writing Module

**Owner:** `src/features/writing/`
**Purpose:** AI-powered content writing with 3 modes, anti-slop review, platform adaptation, and rich text editing.

## Scope
Files in this directory handle:
- TipTap rich text editor integration
- Writing mode selector (full draft, outline+expand, co-writing)
- Platform preview (LinkedIn vs blog)
- Anti-slop review report display
- Cover image upload UI
- Character counter (LinkedIn limit)
- API client functions for `/api/write/*` and `/api/drafts/*` endpoints
- TanStack Query hooks for drafts and writing operations

## Dependencies
- `src/shared/lib/ai-client.ts` — Claude API for all writing modes
- `src/shared/lib/prompts/*` — Modular prompt templates
- `src/shared/lib/db.ts` — Drizzle client
- `src/shared/components/ui/*` — shadcn/ui primitives
- `src/db/schema.ts` — `drafts`, `draftVersions`, `draftResearchLinks` tables
- TipTap packages (`@tiptap/react`, `@tiptap/starter-kit`, etc.)

## Cross-Boundary Rules
- Do NOT modify files in other feature folders without approval
- Do NOT modify `src/shared/lib/prompts/*` without approval (shared prompt templates)
- Do NOT modify `src/db/schema.ts` without approval (shared resource)
- API routes at `src/app/api/write/*` and `src/app/api/drafts/*` are owned by this feature
