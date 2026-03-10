# ADR-001: Drizzle ORM over Prisma

**Date:** 2026-03-10
**Status:** Accepted

## Context
Need an ORM for SQLite as the local database for all work-in-progress data (research, drafts, schedules).

## Decision
Use **Drizzle ORM** with `better-sqlite3` driver.

## Rationale
- **Bundle size:** Drizzle is ~7.4KB vs Prisma's ~1.6MB (no binary engine required)
- **Schema-as-TypeScript:** Schema defined in `.ts` files with full type inference — no separate schema language or code generation step
- **SQLite-native:** `better-sqlite3` is synchronous and purpose-built for SQLite; Prisma's SQLite support uses the same async adapter as its other databases
- **Migration simplicity:** `drizzle-kit` generates SQL migrations from schema diffs
- **Single-user context:** We don't need Prisma's connection pooling or multi-database features

## Alternatives Considered
- **Prisma:** More mature ecosystem and documentation, but heavier for a single-user SQLite app
- **Raw SQL:** Maximum control but no type safety or migration tooling
- **Knex:** Query builder without full ORM features; less TypeScript integration

## Consequences
- Team must learn Drizzle's API (different from Prisma's client API)
- Drizzle's ecosystem is smaller (fewer community plugins)
- Schema changes require running `drizzle-kit generate` then `drizzle-kit migrate`
