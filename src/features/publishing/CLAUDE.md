# Feature Boundary: Publishing Module

**Owner:** `src/features/publishing/`
**Purpose:** Publishing to Firebase blog and LinkedIn, scheduling, and post status tracking.

## Scope
Files in this directory handle:
- Publish dashboard UI (scheduled, published, failed posts)
- Schedule picker (date/time per platform)
- Post preview before publishing
- Publish status indicators
- LinkedIn OAuth connect button
- API client functions for `/api/publish/*` and `/api/schedule/*` endpoints
- TanStack Query hooks for schedules and publishing

## Dependencies
- `src/shared/lib/firebase-admin.ts` — Firebase Firestore write + Storage upload
- `src/shared/lib/linkedin-client.ts` — LinkedIn API post creation + OAuth
- `src/shared/lib/scheduler.ts` — node-cron scheduling
- `src/shared/lib/db.ts` — Drizzle client
- `src/shared/components/ui/*` — shadcn/ui primitives
- `src/db/schema.ts` — `schedules`, `drafts` tables

## Cross-Boundary Rules
- Do NOT modify files in other feature folders without approval
- Do NOT modify `src/shared/lib/firebase-admin.ts` without approval (shared publishing bridge)
- Do NOT modify `src/db/schema.ts` without approval (shared resource)
- API routes at `src/app/api/publish/*` and `src/app/api/schedule/*` are owned by this feature
