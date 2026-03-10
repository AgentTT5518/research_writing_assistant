# Testing Strategy

**Date:** 2026-03-10
**Tools:** Vitest (unit/integration), Playwright (E2E)

---

## Test Structure

```
tests/
  unit/
    features/
      research/          # Research service, hooks, utils
      writing/           # Writing service, prompt composition, utils
      publishing/        # Publishing service, scheduler logic
      content-management/ # Project CRUD, search
    shared/
      lib/               # AI client, Firebase client, LinkedIn client, logger
      prompts/           # Prompt template composition
  integration/
    api/                 # API route integration tests
      research/
      write/
      drafts/
      publish/
      schedule/
      projects/
  e2e/
    research-flow.spec.ts
    writing-flow.spec.ts
    publish-flow.spec.ts
    project-management.spec.ts
```

## Testing by Layer

### Unit Tests (Vitest)

**What to test:**
- Prompt template composition (correct assembly of modular pieces)
- Vocabulary ban list matching logic
- Anti-slop scoring algorithm
- Draft status lifecycle transitions
- Scheduler tick logic (which jobs to process)
- Content validation (XSS defense-in-depth)
- Reading time calculation
- AI cost estimation
- nanoid generation, date formatting, etc.

**Mocking strategy:**
- Claude API → mock Anthropic SDK responses (fixed text or streaming chunks)
- Tavily → mock HTTP responses with sample search results
- Firebase Admin SDK → mock Firestore and Storage operations
- LinkedIn API → mock HTTP responses
- SQLite → use in-memory SQLite via Drizzle for fast test execution

```typescript
// Example: in-memory DB for unit tests
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@/db/schema';

const sqlite = new Database(':memory:');
const db = drizzle(sqlite, { schema });
```

### Integration Tests (Vitest)

**What to test:**
- API routes return correct responses for valid/invalid inputs
- Zod validation rejects malformed requests
- Database queries return expected results
- Draft CRUD with version history creation
- Schedule creation and cancellation

**Approach:**
- Test API routes directly using Next.js test utilities
- Use real SQLite (in-memory) with seeded test data
- External APIs mocked at the HTTP level (MSW or manual mocks)

### E2E Tests (Playwright)

**Key flows to test:**

1. **Research Flow:**
   - Create project → Search web → Save result → Tag result → View library

2. **Writing Flow:**
   - Select project → Choose writing mode → Generate draft → View preview → Edit → Save

3. **Publish Flow:**
   - Approve draft → Set schedule → Verify schedule appears in dashboard → (mock) publish

4. **Project Management:**
   - Create project → Add research → Write draft → View in content library → Archive

**E2E mocking:**
- Use Playwright route interception to mock external APIs
- Firebase and LinkedIn publish calls intercepted and verified (not sent to real services)

## External API Mocking

| Service | Mock Approach | Why |
|---------|--------------|-----|
| Claude API | MSW interceptor returning fixed/streaming text | Avoid API costs in tests |
| Tavily | MSW interceptor returning sample search results | Avoid API costs and rate limits |
| Semantic Scholar | MSW interceptor returning sample paper data | Rate limit sensitive |
| arXiv | MSW interceptor returning sample XML | Rate limit sensitive |
| Firebase Admin | `vi.mock('firebase-admin')` with fake Firestore/Storage | Don't write to production DB |
| LinkedIn API | MSW interceptor returning success responses | Don't post to real LinkedIn |

## Test Data

Seed data in `src/db/seed.ts` provides:
- 2 sample projects with descriptions
- 5 research items (mix of web, URL, academic sources)
- 2 drafts (one draft status, one published)
- Default app_config entries (ban lists, settings)

## Coverage Targets

| Layer | Target | Priority |
|-------|--------|----------|
| Prompt composition | 90%+ | High — core value of the app |
| API routes | 80%+ | High — data integrity |
| Scheduler logic | 90%+ | High — publishing reliability |
| UI components | 60%+ | Medium — visual correctness |
| E2E flows | 4 core flows | High — end-to-end confidence |

## Running Tests

```bash
# All tests
npm run test

# Unit tests only (fast, no server needed)
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests (requires dev server running)
npm run dev &
npm run test:e2e

# Watch mode during development
npm run test:unit -- --watch

# Coverage report
npm run test:unit -- --coverage
```

## Pre-Commit Checklist (CLAUDE.md Rule 2)

Before every commit, run:
```bash
npm run typecheck && npm run lint && npm run test
```

All three must pass. If tests fail, fix before committing.
