# ADR-003: Tavily for Web Search

**Date:** 2026-03-10
**Status:** Accepted

## Context
The research module needs a web search API that returns clean, AI-ready content for the Claude API to work with.

## Decision
Use **Tavily Search API** for web search.

## Rationale
- **AI-ready output:** Returns pre-cleaned, extracted content (not raw HTML) — eliminates the need for a separate scraping/cleaning step
- **Free tier:** 1,000 searches/month is sufficient for personal use
- **Purpose-built for AI:** Designed specifically for LLM-powered applications; results are optimized for context injection
- **Simple API:** Single endpoint, straightforward JSON response with title, URL, content, and relevance score

## Alternatives Considered
- **SerpAPI:** More search engines supported but returns raw search result links (requires separate scraping)
- **Brave Search API:** Good privacy story but returns snippets, not full content
- **Google Custom Search:** Limited to 100 free queries/day; requires custom search engine setup
- **Firecrawl:** Great for deep scraping but more complex; Tavily is simpler for search-then-read

## Consequences
- Dependent on Tavily's availability and pricing changes
- 1,000/month limit may require upgrade if usage grows
- For URLs the user pastes directly, we still need a separate scraping approach (fetch + Claude summarize) since Tavily is for search queries, not specific URL ingestion
