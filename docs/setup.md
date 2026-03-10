# Development Setup Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Firebase project** (existing Personal-Website project for publishing)
- **API keys** for: Anthropic (Claude), Tavily, LinkedIn (optional for dev)

## First-Time Setup

### 1. Clone & Install

```bash
git clone https://github.com/AgentTT5518/research_writing_assistant.git
cd research_writing_assistant
npm install
```

### 2. Environment Variables

Copy the example and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```
# AI
ANTHROPIC_API_KEY=sk-ant-...         # Claude API key (required)
TAVILY_API_KEY=tvly-...              # Tavily search (required)
OPENAI_API_KEY=sk-...                # OpenAI embeddings (future, optional)

# Firebase (for publishing to blog)
FIREBASE_SERVICE_ACCOUNT_KEY='{...}' # Full JSON service account key

# LinkedIn (optional — set up when ready to publish)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/publish/linkedin/callback
```

**Getting the Firebase service account key:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Copy the entire JSON into `FIREBASE_SERVICE_ACCOUNT_KEY` (as a single-line JSON string)

### 3. Database Setup

```bash
npm run db:generate   # Generate migration files from schema
npm run db:migrate    # Create dev.db with all tables
npm run db:seed       # Seed default config (ban lists, settings)
```

This creates `dev.db` in the project root. It's gitignored — your data stays local.

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Common Commands

```bash
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run test          # Run all tests
npm run test:unit     # Unit tests only (Vitest)
npm run test:e2e      # E2E tests (Playwright, requires dev server)
npm run lint          # ESLint + Prettier check
npm run typecheck     # TypeScript strict check
npm run db:generate   # Generate migration from schema diff
npm run db:migrate    # Apply pending migrations
npm run db:seed       # Seed default config data
npm run db:studio     # Open Drizzle Studio (visual DB browser)
npm run scheduler     # Run scheduler standalone (fallback if instrumentation hook unavailable)
```

## Database Management

**Schema changes:**
1. Edit `src/db/schema.ts`
2. Run `npm run db:generate`
3. Run `npm run db:migrate`
4. Commit the migration file to git

**View your data:**
```bash
npm run db:studio     # Opens visual browser at https://local.drizzle.studio
```

**Backups:**
- Auto-backup runs daily (first scheduler tick of the day)
- Stored in `backups/dev-{YYYY-MM-DD}.db` (last 7 kept)
- Manual backup: `cp dev.db backups/dev-manual-$(date +%Y%m%d).db`

## LinkedIn Setup (When Ready)

1. Create a LinkedIn app at [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Request the following products: "Share on LinkedIn", "Sign In with LinkedIn using OpenID Connect"
3. Set the OAuth redirect URL to: `http://localhost:3000/api/publish/linkedin/callback`
4. Copy Client ID and Client Secret to `.env.local`
5. In the app, go to Settings → click "Connect LinkedIn"
6. Authorize the app in the browser popup

## Troubleshooting

**`dev.db` is missing or corrupted:**
```bash
rm dev.db
npm run db:migrate
npm run db:seed
```

**Scheduler not running (posts not publishing on time):**
- Check that `experimental: { instrumentationHook: true }` is in `next.config.js`
- Or run `npm run scheduler` in a separate terminal as fallback

**Firebase publish fails:**
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
- Check that the service account has Firestore and Storage write access
- Run `npm run dev` and check server logs for `[publish]` tag errors

**Claude API errors:**
- Verify `ANTHROPIC_API_KEY` is valid
- Check usage limits at [Anthropic Console](https://console.anthropic.com/)
- Server logs will show `[ai]` tag for all AI-related errors
