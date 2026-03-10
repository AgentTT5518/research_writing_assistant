# ADR-002: TipTap for Rich Text Editing

**Date:** 2026-03-10
**Status:** Accepted

## Context
The writing module needs a rich text editor that supports markdown, character counting (LinkedIn's 3,000 char limit), and platform-specific previews.

## Decision
Use **TipTap 2.x** (headless editor framework built on ProseMirror).

## Rationale
- **Headless architecture:** No built-in UI — full control over styling with Tailwind CSS
- **Modular extensions:** Only load what we need (StarterKit, CharacterCount, Markdown, Image, Placeholder)
- **Character count extension:** Critical for LinkedIn's 3,000-character limit — built-in, not custom
- **Markdown I/O:** Import/export markdown for the blog's plain-text content format
- **React integration:** First-class `@tiptap/react` package with hooks

## Alternatives Considered
- **Slate.js:** More low-level control but requires building most features from scratch; steeper learning curve
- **MDXEditor:** Good markdown support but less flexible for non-markdown outputs (LinkedIn plain text)
- **Lexical (Meta):** Powerful but complex; overkill for our use case
- **Quill:** Aging ecosystem, limited extensibility, not headless

## Consequences
- ProseMirror concepts (nodes, marks, schemas) have a learning curve
- Need to build custom UI for toolbar, menus, and formatting controls
- Extensions must be carefully selected to avoid bundle bloat
