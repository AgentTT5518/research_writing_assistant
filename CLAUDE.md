# CLAUDE.md

## Project Overview
<!-- Replace with your project description -->
[Project Name] — [2-3 sentence description of what this project does, who it serves, and the core problem it solves.]

## Tech Stack
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Next.js API Routes
- Database: Firebase Firestore
- AI: Claude API (Anthropic), OpenAI Embeddings
- Auth: Firebase Auth
- Testing: Vitest (unit), Playwright (E2E)
- Deployment: Vercel

## Commands
```
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run all tests
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E tests (requires dev server running)
npm run lint         # ESLint + Prettier check
npm run typecheck    # TypeScript strict check
```

## Project Structure
```
src/
  app/                    # Next.js App Router pages
  features/               # Feature modules — each has its own CLAUDE.md boundary
    [feature-name]/
      CLAUDE.md           # Feature boundary rules (see Rule 5)
      components/ hooks/ services/ types.ts
  shared/                 # Cross-feature utilities, types, components
    CLAUDE.md             # Boundary: ask before modifying
tests/                    # unit/, integration/, e2e/ (mirrors src/features/)
docs/                     # requirements/, decisions/, testing/, templates/
```

Every feature folder MUST have its own `CLAUDE.md`. Template: `docs/templates/FEATURE-CLAUDE.md`

## Code Conventions
- TypeScript strict mode — no `any` without justification comment
- Functional components with hooks only
- Named exports over default exports
- `async/await` over `.then()` chains
- Every async op wrapped in try-catch with typed errors
- Use project logger (`src/lib/logger.ts`), never bare `console.log`
- File naming: kebab-case for files, PascalCase for components

## Git Workflow
- Branches: `feature/[short-desc]`, `fix/[short-desc]`
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Never commit to `main` directly — feature branches only
- Run full test suite before every commit

## Parallel Development
- Use `git worktree add ../project-[feature] feature/[name]` for isolated workspaces
- One Claude Code session per worktree — never share
- Shared contracts (types, interfaces) merge to `main` before feature work begins
- Scope by feature, not by file — each person owns a vertical slice
- Small frequent PRs — rebase on `main` before opening
- Full details: `docs/parallel-development.md`

---

## MANDATORY RULES

### Rule 1: Secret Protection
Before every commit, scan for exposed secrets:
```bash
grep -rn "sk-\|AKIA\|ghp_\|firebase.*apiKey\|Bearer \|password\s*=" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.env" src/ tests/ . 2>/dev/null | grep -v node_modules | grep -v ".env.example"
```
- All secrets in `.env.local` only (never committed)
- `.env*` (except `.env.example`) MUST be in `.gitignore`
- `.env.example` must exist with placeholders for all required vars
- Secrets only in server components / API routes — never client-side
- New env vars → add to `.env.example` immediately
- **If a secret is detected, STOP. Do not commit. Alert me.**

### Rule 2: Test & Review Every Feature
- Write tests DURING implementation, not after (unit + integration + E2E)
- Run before every commit: `npm run typecheck && npm run lint && npm run test`
- Self-review before committing:
  - Matches requirements in `docs/requirements/`?
  - All new code paths tested? Error cases handled?
  - No hardcoded config values? No bare `console.log`?
  - No unjustified `any` types? Secret scan passed (Rule 1)?
- **If tests fail, fix before moving on. Never skip.**

### Rule 3: Error Logging
- Use structured logger at `src/lib/logger.ts` for ALL logging
- If logger doesn't exist, create it from `docs/templates/logger-template.ts`
- Every try-catch → `logger.error('[feature-name]', 'description', error)`
- Every API route → log entry + errors
- Every external service call → log failures with context
- Feature tag is mandatory first arg — logs must be filterable
- NEVER log secrets, passwords, or tokens
- No bare `console.log/error/warn` in production code

### Rule 4: Update ARCHITECTURE.md After Every Feature
- Lives at project root — if missing, create from `docs/templates/ARCHITECTURE-TEMPLATE.md`
- After each feature: update Component Map, API Endpoints, Feature Log, Mermaid diagram
- Always update "Last updated" date

### Rule 5: Feature Boundary — HARD BLOCK
**NEVER edit files outside your current feature folder without user approval.**
- ONLY modify files within `src/features/[current-feature]/` freely
- ASK before touching: other features, `src/shared/`, `src/app/`, `package.json`, config files, schemas, `ARCHITECTURE.md`
- Use this format when asking:
  ```
  ⚠️ BOUNDARY ALERT
  File:   [path]
  Reason: [why]
  Change: [what]
  Risk:   [Low/Med/High]
  Proceed? (yes/no)
  ```
- Log approved cross-boundary edits in feature's SCRATCHPAD.md
- Template: `docs/templates/FEATURE-CLAUDE.md`

---

## Reference Docs (Read When Relevant)
- `ARCHITECTURE.md` — Living system design (update per Rule 4)
- `docs/requirements/` — Feature specs and acceptance criteria
- `docs/decisions/` — Architecture Decision Records
- `docs/testing/` — Test strategies per feature
- `docs/parallel-development.md` — Worktree setup and multi-dev workflow
- `docs/templates/logger-template.ts` — Structured logger implementation
- `docs/templates/ARCHITECTURE-TEMPLATE.md` — Architecture doc template
- `docs/templates/FEATURE-CLAUDE.md` — Feature boundary template

## Workflow — Every New Feature
```
1. WORKTREE  → git worktree add ../project-[feature] feature/[name]
2. CONTRACTS → Shared types/interfaces → merge to main FIRST
3. BOUNDARY  → Create src/features/[name]/CLAUDE.md from template
4. PLAN      → /plan mode → write docs/requirements/[feature].md
5. DESIGN    → Architecture decisions → update ARCHITECTURE.md
6. BUILD     → Implement + tests + logger — ASK before cross-boundary edits (Rule 5)
7. REVIEW    → Secret scan (R1) + tests (R2) + checklist
8. DOCUMENT  → Update ARCHITECTURE.md Feature Log (R4)
9. COMMIT    → Conventional commit → push feature branch
10. PR       → Rebase on main → open pull request
```
