# Feature Boundary: Content Management Module

**Owner:** `src/features/content-management/`
**Purpose:** Project/topic workspaces, draft listing with status tracking, and cross-content search.

## Scope
Files in this directory handle:
- Project list and project card UI
- Draft list with status filters (draft, scheduled, published)
- Content search across research and drafts
- API client functions for `/api/projects/*` endpoints
- TanStack Query hooks for projects

## Dependencies
- `src/shared/lib/db.ts` — Drizzle client
- `src/shared/components/ui/*` — shadcn/ui primitives
- `src/db/schema.ts` — `projects` table

## Cross-Boundary Rules
- Do NOT modify files in other feature folders without approval
- Do NOT modify `src/db/schema.ts` without approval (shared resource)
- API routes at `src/app/api/projects/*` are owned by this feature
