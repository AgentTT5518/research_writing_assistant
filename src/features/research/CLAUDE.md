# Feature Boundary: Research Module

**Owner:** `src/features/research/`
**Purpose:** Web search, URL ingestion, academic paper search, and research library management.

## Scope
Files in this directory handle:
- Search panel UI (web + academic)
- URL input and scraping trigger
- Research library (list, filter, tag, delete)
- Research item cards and source badges
- API client functions for `/api/research/*` endpoints
- TanStack Query hooks for research data

## Dependencies
- `src/shared/lib/tavily-client.ts` — Web search
- `src/shared/lib/academic-client.ts` — Semantic Scholar + arXiv
- `src/shared/lib/ai-client.ts` — URL summarization via Claude
- `src/shared/lib/db.ts` — Drizzle client
- `src/shared/components/ui/*` — shadcn/ui primitives
- `src/db/schema.ts` — `researchItems`, `tags`, `researchItemTags` tables

## Cross-Boundary Rules
- Do NOT modify files in other feature folders without approval
- Do NOT modify `src/shared/` without approval
- Do NOT modify `src/db/schema.ts` without approval (shared resource)
- API routes at `src/app/api/research/*` are owned by this feature
