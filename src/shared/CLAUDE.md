# Boundary: Shared Module

**Owner:** `src/shared/`
**Purpose:** Cross-feature utilities, types, components, and service clients used by multiple features.

## Scope
Files in this directory include:
- **Layout components:** Sidebar, header, page shell
- **UI primitives:** shadcn/ui components (button, card, dialog, etc.)
- **Service clients:** AI (Claude), Firebase Admin, LinkedIn, Tavily, Academic search, Scheduler
- **Prompt templates:** Modular prompt composition for all AI writing modes
- **Types:** Shared TypeScript types for database, API, and AI interfaces
- **Logger:** Structured JSON logger with feature tags
- **DB client:** Drizzle ORM initialization

## Cross-Boundary Rules
**This directory is shared infrastructure. Any modification requires user approval.**

Changes here can affect all features. Before modifying:
1. Identify which features depend on the file being changed
2. Ensure backward compatibility or coordinate updates across features
3. Use the boundary alert format from CLAUDE.md Rule 5
