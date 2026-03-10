# ADR-004: Database-Backed Scheduling with node-cron

**Date:** 2026-03-10
**Status:** Accepted

## Context
The app needs to publish content at user-specified future dates/times. Scheduled jobs must survive server restarts.

## Decision
Use **node-cron** as a polling mechanism with **SQLite as the source of truth** for schedule state.

## Rationale
- **Restart-safe:** Schedules are stored in SQLite's `schedules` table with status and `scheduledAt` timestamp. node-cron simply polls every 60 seconds for due jobs — if the server restarts, it picks up where it left off
- **No external dependency:** No need for Redis, Bull, or a separate queue service
- **Simple mental model:** One cron job, one query (`WHERE scheduledAt <= NOW AND status = 'pending'`), process each result
- **Atomic status transitions:** `pending → publishing → published/failed` tracked in the database with error messages

## Architecture
```
App boot (instrumentation.ts)
  └── Start node-cron: "* * * * *" (every 60 seconds)
        └── tick():
              1. SELECT * FROM schedules WHERE scheduledAt <= NOW AND status = 'pending'
              2. For each:
                 a. UPDATE status = 'publishing'
                 b. Call publish service (Firebase and/or LinkedIn)
                 c. On success: UPDATE status = 'published', publishedAt = NOW
                 d. On failure: UPDATE status = 'failed', errorMessage = error
              3. Update parent draft status accordingly
```

## Alternatives Considered
- **Vercel Cron Jobs:** Good for deployed apps but doesn't work locally; this is a local-first app
- **BullMQ + Redis:** Production-grade job queue but overkill — requires running Redis for a single-user app
- **setTimeout/setInterval:** Doesn't survive restarts; no persistence
- **node-schedule:** Similar to node-cron but less maintained

## Consequences
- Maximum publish delay is ~60 seconds from the scheduled time (acceptable for content publishing)
- The cron job runs even when no schedules are pending (minimal overhead — single SQLite query)
- If the server is down at the scheduled time, the post publishes when the server next starts (catch-up behavior)
- Next.js `instrumentation.ts` hook used for startup — requires Next.js 14+ experimental instrumentation config
