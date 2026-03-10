# Product Requirements Document (PRD)
# Research Writing Assistant

**Version:** 1.0
**Date:** 2026-03-10
**Status:** Draft

---

## 1. Overview

**Research Writing Assistant** is a personal web application that streamlines the end-to-end workflow of researching topics, writing content, and publishing to LinkedIn and a Firebase-hosted personal blog. It provides AI-powered writing assistance across multiple modes and supports scheduling posts for future publication.

### Problem Statement
Creating high-quality content for LinkedIn and a personal blog requires a fragmented workflow: researching across multiple sources, synthesizing information, writing drafts, adapting content per platform, and manually posting. This tool consolidates the entire pipeline into a single application.

### Target User
Single user (personal tool) — no multi-tenancy or authentication system required.

---

## 2. Core Workflow

### 2.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HUMAN ACTION                                 │
│  User enters a topic manually                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: RESEARCH (AI-driven, no approval needed)                   │
│  ├── AI searches web, academic sources for the topic                │
│  ├── AI ingests and summarizes findings                             │
│  ├── AI saves research items with tags + source metadata            │
│  └── User can optionally paste additional URLs to include           │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: WRITE (AI-driven, no approval needed)                      │
│  ├── AI identifies strongest angle from research                    │
│  ├── AI generates draft (using selected writing mode)               │
│  ├── AI runs anti-slop review pass automatically                    │
│  ├── AI adapts content for both LinkedIn and blog formats           │
│  └── AI attaches relevant cover image if available                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     HUMAN GATE (only checkpoint)                    │
│  STEP 3: REVIEW & APPROVE                                           │
│  ├── User reviews LinkedIn version and blog version                 │
│  ├── User can edit inline or request AI revisions                   │
│  ├── User can reject and send back to Step 2 with feedback          │
│  └── User approves → moves to Step 4                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: SCHEDULE & PUBLISH (User sets time, system executes)       │
│  ├── User picks publish date/time per platform                      │
│  ├── System queues the scheduled post                               │
│  ├── At scheduled time: publish to LinkedIn API + Firebase blog     │
│  └── User gets confirmation of successful publish                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Human Touchpoints Summary

| Step | Who | Action |
|------|-----|--------|
| Enter topic | Human | Types the topic to research and write about |
| Research | AI | Autonomous — searches, summarizes, organizes |
| (Optional) Add URLs | Human | Can paste specific URLs to include in research |
| Write + Adapt | AI | Autonomous — drafts, anti-slop review, platform adaptation |
| **Review & Approve** | **Human** | **Only required gate — review, edit, approve or reject** |
| Schedule | Human | Sets publish date/time |
| Publish | System | Automated at scheduled time |

### 2.3 Research Phase
- **Topic Input**: User manually enters a topic (no AI-suggested topics in v1)
- **Web Search**: AI searches the web for articles, blog posts, and general information
- **URL Ingestion**: User can paste additional URLs; AI scrapes, parses, and summarizes
- **Academic Papers**: AI searches Google Scholar, arXiv for relevant papers
- **Research Library**: All findings saved with tags, notes, and source metadata

### 2.4 Writing Phase
Three AI-assisted writing modes, switchable per session:

| Mode | Description |
|------|-------------|
| **Full Draft** | AI generates a complete draft from research notes; user edits and refines |
| **Outline + Expand** | AI creates a structured outline; user selects sections to expand |
| **Co-Writing** | Interactive back-and-forth; AI assists paragraph-by-paragraph as user writes |

- Default professional tone (no custom voice training in v1)
- Platform-aware formatting: LinkedIn post conventions vs. blog post structure
- Automatic adaptation of the same content for both platforms
- Anti-slop review runs automatically after draft generation

### 2.5 Review & Scheduling Phase
- **Draft Review**: Preview content as it will appear on each platform
- **Edit**: Inline editing with AI suggestions
- **Schedule**: Set future publish date/time for each platform independently
- **Publishing**: Automated posting via LinkedIn API and Firebase blog on schedule

---

## 3. Functional Requirements

### FR-1: Research Module
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Web search with keyword queries, returning summarized results | Must |
| FR-1.2 | URL ingestion — paste a URL, extract and summarize key content | Must |
| FR-1.3 | Academic paper search (Google Scholar, arXiv) with abstract summaries | Must |
| FR-1.4 | Save research items to a personal library with tags and notes | Must |
| FR-1.5 | Search and filter saved research by tags, keywords, date | Should |
| FR-1.6 | Highlight and annotate key passages from research sources | Could |

### FR-2: Writing Module
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Full draft generation from selected research notes | Must |
| FR-2.2 | Outline generation with section-by-section expansion | Must |
| FR-2.3 | Co-writing mode with interactive AI assistance | Must |
| FR-2.4 | Platform-specific formatting (LinkedIn vs. blog) | Must |
| FR-2.5 | Content adaptation — generate both LinkedIn and blog versions from one draft | Must |
| FR-2.6 | Rich text editor with markdown support | Must |
| FR-2.7 | Version history for drafts | Should |
| FR-2.8 | AI-powered suggestions for improving clarity, engagement, SEO | Should |
| FR-2.9 | Upload and attach cover images to posts | Must |
| FR-2.10 | Anti-AI-slop review pass — scoring mode (0-100) with top 5 suggestions; full rewrite opt-in | Must |
| FR-2.11 | Reading time estimate displayed in blog preview (words / 200 wpm) | Should |

### FR-3: Publishing Module
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Draft preview per platform (LinkedIn and blog) | Must |
| FR-3.2 | Schedule posts for future publish date/time | Must |
| FR-3.3 | Publish to LinkedIn via LinkedIn API (text + images) | Must |
| FR-3.4 | Publish to Firebase-hosted blog (direct Firestore write) | Must |
| FR-3.5 | Publishing dashboard — view scheduled, published, and draft posts | Must |
| FR-3.6 | Edit or cancel scheduled posts before publish time | Should |
| FR-3.7 | Post-publish analytics (views, engagement) from LinkedIn API | Could |

### FR-4: Content Management
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Project/topic workspace — group research and drafts by topic | Must |
| FR-4.2 | List all drafts with status (draft, scheduled, published) | Must |
| FR-4.3 | Search across all content (research, drafts, published) | Should |
| FR-4.4 | Export content as markdown or plain text | Could |
| FR-4.5 | AI usage and cost tracking dashboard in Settings | Should |
| FR-4.6 | Daily auto-backup of SQLite database (keep 7 days) | Should |

---

## 4. Non-Functional Requirements

| ID | Requirement | Details |
|----|-------------|---------|
| NFR-1 | Performance | Page load < 2s, AI responses < 10s |
| NFR-2 | Availability | Personal tool; best-effort uptime on Vercel |
| NFR-3 | Security | API keys server-side only; no secrets in client code |
| NFR-4 | Data Storage | Local app DB for drafts/research; Firebase (Personal-Website) for published content only |
| NFR-5 | Responsive | Desktop-first, functional on tablet; mobile not required |

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Rich Text Editor | TipTap 2.x (headless, modular extensions) |
| State Management | TanStack Query 5.x + URL state |
| Backend | Next.js API Routes |
| Local Database | SQLite via Drizzle ORM + better-sqlite3 |
| Publishing DB | Firebase Firestore (Personal-Website project — blog `posts/` collection) |
| Image Storage | Firebase Storage (Personal-Website project — `/images/` path) |
| Firebase SDK | Firebase Admin SDK (server-side, service account) |
| AI | Claude API (Anthropic) for writing; OpenAI Embeddings for semantic search (future) |
| Web Search | Tavily Search API (AI-ready cleaned results) |
| Academic Search | Semantic Scholar API + arXiv API |
| Scheduling | node-cron (polls SQLite every 60s; survives restarts) |
| LinkedIn API | LinkedIn Marketing API (OAuth 2.0) |
| Validation | zod schemas for all API inputs |
| Deployment | Local-first (localhost:3000); optional Vercel deployment later |

---

## 6. Architecture (High-Level)

### 6.1 Data Architecture — Two-Zone Model

The app uses a **local-first** approach: all work-in-progress data stays on localhost. Firebase (Personal-Website project) is only touched at publish time.

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL ZONE (localhost)                        │
│                    App's own database                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │  research/   │  │  drafts/    │  │  schedules/  │            │
│  │  - items     │  │  - content  │  │  - jobs      │            │
│  │  - tags      │  │  - versions │  │  - status    │            │
│  │  - sources   │  │  - status   │  │  - platform  │            │
│  │  - summaries │  │  - images   │  │  - datetime  │            │
│  └─────────────┘  └─────────────┘  └──────┬───────┘            │
│                                           │                     │
│  ┌─────────────┐  ┌─────────────┐         │                     │
│  │  projects/   │  │  config/    │         │                     │
│  │  - topics    │  │  - prompts  │         │                     │
│  │  - grouping  │  │  - ban list │         │                     │
│  └─────────────┘  └─────────────┘         │                     │
└───────────────────────────────────────────┼─────────────────────┘
                                            │
                          ┌─────────────────┼──────────────────┐
                          │     PUBLISH GATE (on schedule)     │
                          │     Human-approved content only     │
                          └─────────┬───────────┬──────────────┘
                                    │           │
                    ┌───────────────▼──┐  ┌─────▼──────────────────┐
                    │  LINKEDIN API    │  │  FIREBASE (Personal-   │
                    │  - Post text     │  │  Website project)      │
                    │  - Post image    │  │  - posts/ collection   │
                    │  - OAuth 2.0     │  │  - /images/ storage    │
                    └──────────────────┘  └────────────────────────┘
```

### 6.2 Data Flow by Stage

| Stage | Data Created | Stored In | Flows To |
|-------|-------------|-----------|----------|
| Topic input | Topic name, description | Local `projects/` | — |
| Research | Sources, summaries, tags, metadata | Local `research/` | Writing phase |
| Writing | Drafts (LinkedIn + blog versions), images | Local `drafts/` | Review phase |
| Anti-slop review | Quality scores, revision suggestions | Local `drafts/` (attached) | Review phase |
| Review & Edit | Final approved content | Local `drafts/` (status → approved) | Scheduling |
| Schedule | Publish job (platform, datetime) | Local `schedules/` | Publish gate |
| **Publish** | **Published post** | **Firebase Firestore `posts/`** + **Firebase Storage `/images/`** | Blog readers |
| **Publish** | **Published post** | **LinkedIn API** | LinkedIn feed |
| Post-publish | Publish confirmation, timestamps | Local `drafts/` (status → published) | Dashboard |

### 6.3 API Route Architecture

```
[Browser UI — localhost:3000]
     |
[Next.js App Router]
     |
     ├── /api/research/*      → Web search, URL scraping, academic search
     │                          Reads/writes: Local DB
     │
     ├── /api/write/*          → AI writing (Claude API), draft CRUD
     │                          Reads: Local research/    Writes: Local drafts/
     │
     ├── /api/publish/*        → LinkedIn API + Firebase blog write
     │                          Reads: Local drafts/      Writes: Firebase + LinkedIn
     │
     └── /api/schedule/*       → Cron-triggered publishing
                                Reads: Local schedules/   Triggers: /api/publish/
```

### 6.4 Local Database: SQLite

All work-in-progress data stored in SQLite (via Drizzle ORM):
- Zero-config, file-based, no external DB server needed
- Single `dev.db` file in the project root
- Full relational queries for research, drafts, schedules
- All CRUD operations managed through the web app UI — no CLI or manual file editing
```

---

## 7. Key Screens

1. **Dashboard** — Overview of recent research, drafts in progress, upcoming scheduled posts
2. **Research Workspace** — Search interface, URL input, saved research library
3. **Writing Editor** — Mode selector (full draft / outline / co-write), rich text editor, platform preview toggle
4. **Publishing** — Draft preview, schedule picker, publish button, post history
5. **Content Library** — All projects/topics with their research and drafts

---

## 8. MVP Scope (v1)

**In scope:**
- Web search and URL ingestion for research
- Academic paper search (basic — Google Scholar)
- Research library with tagging
- All three writing modes (full draft, outline+expand, co-writing)
- LinkedIn and blog content generation
- Draft review and inline editing
- Post scheduling with automated publishing
- LinkedIn API integration
- Firebase blog publishing

**Out of scope (future):**
- Custom voice/style training
- Twitter/X threads, newsletters
- Multi-user/team support
- Mobile-optimized UI
- Post analytics dashboard
- AI image generation for posts

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Research-to-publish time | < 30 minutes per post |
| Posts published per week | 3+ (1 blog + 2 LinkedIn) |
| Scheduling reliability | 100% of scheduled posts publish on time |

---

## 10. Resolved Questions

1. **Firebase blog schema** — Resolved. See Appendix B for full Firestore schema from existing Personal-Website project.
2. **LinkedIn API** — User will set up a LinkedIn developer app. App will integrate via LinkedIn Marketing API (OAuth 2.0).
3. **Prompt templates & content guidelines** — Resolved. See `docs/requirements/content-guidelines-and-prompt-templates.md` for complete anti-AI-slop rules, prompt templates for all writing modes, and platform-specific content structure guidelines.
4. **Media support** — Yes, v1 will support images/media for both blog posts and LinkedIn posts. See Appendix B for image handling details.

---

## Appendix: User Stories

- **As a user**, I want to search the web for a topic and save relevant findings so I can reference them while writing.
- **As a user**, I want to paste a URL and get an AI-generated summary so I can quickly extract key points.
- **As a user**, I want to search academic papers so I can back my content with credible sources.
- **As a user**, I want AI to generate a full draft from my research notes so I can start with a solid foundation.
- **As a user**, I want to switch between writing modes so I can choose the level of AI assistance I need.
- **As a user**, I want to preview how my post will look on LinkedIn vs. my blog so I can optimize for each platform.
- **As a user**, I want to schedule posts for specific dates and times so I can maintain a consistent publishing cadence.
- **As a user**, I want posts to automatically publish on schedule so I don't have to manually post.
- **As a user**, I want to upload cover images for blog posts and LinkedIn posts so my content is visually engaging.

---

## Appendix B: Firebase Blog Schema (Existing Personal-Website)

The Research Writing Assistant must write to the existing Firestore schema used by the Personal-Website blog.

### Posts Collection (`/posts/{postId}`)

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `title` | string | Yes | 1-200 chars | Post title |
| `content` | string | Yes | 1-50,000 chars | Full post content (plain text, whitespace-pre-wrap) |
| `excerpt` | string | No | — | Summary for listing/preview cards |
| `author` | string | Yes | 1-100 chars | Author name or email |
| `published` | boolean | Yes | — | Publication status |
| `imageUrl` | string | No | — | Cover image (Firebase Storage URL or direct HTTPS URL) |
| `createdAt` | timestamp | Yes | — | Auto-set via `serverTimestamp()` |
| `updatedAt` | timestamp | No | — | Auto-set on update |

**Security constraints:**
- Content cannot contain `<script>`, `javascript:`, `onerror=`, or `onclick=` (XSS protection)
- Write access enforced by Firestore security rules (admin-only)
- The Research Writing Assistant uses Firebase Admin SDK (service account) which **bypasses** these rules
- Anyone can read (public)

**Composite index:** `published` (ASC) + `createdAt` (DESC)

### Learning Collection (`/learning/{postId}`)

Extended schema for educational content (if we want to publish learning posts too):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `difficulty` | string | Yes | `beginner`, `intermediate`, or `advanced` |
| `tags` | array[string] | No | Topic tags |
| `series` | string | No | Series name for multi-part content |
| `seriesOrder` | number | No | Order within series |
| `estimatedMinutes` | number | No | Reading time |
| `resources` | array[{name, url}] | No | External resource links |
| *(plus all fields from Posts)* | | | |

### Image Handling

- Images stored in Firebase Storage under `/images/` path
- Max file size: 5MB
- `gs://` URLs converted to HTTPS download URLs at display time via `getStorageUrl()` utility
- Firebase Admin SDK (service account) bypasses Storage security rules for uploads

### Integration Notes

- Blog uses direct Firestore client SDK (no custom API routes for CRUD)
- Content is rendered as plain text with `whitespace-pre-wrap` (no markdown parsing on the blog currently)
- Auto-generated Firestore document IDs
- `serverTimestamp()` handles `createdAt` and `updatedAt`
- The existing blog uses Firebase Auth custom claims for its own admin UI — **the Research Writing Assistant does NOT use this.** It uses Firebase Admin SDK with a service account, which has full read/write access without user-level auth.

### Publishing Requirements

When the Research Writing Assistant publishes to the blog, it must:
1. Write to the `posts` collection with the exact schema above
2. Upload cover images to Firebase Storage `/images/{year}/{month}/{filename}`
3. Get the download URL and store it in the `imageUrl` field
4. Set `published: true` and `createdAt: admin.firestore.FieldValue.serverTimestamp()`
5. Use Firebase Admin SDK with service account (no user-level auth)
6. Validate content with basic defense-in-depth check (no script tags) even though blog renders as plain text
