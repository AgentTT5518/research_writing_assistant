import { logger } from '@/shared/lib/logger';

// arXiv courtesy delay — 3 seconds between requests per their guidelines
let lastArxivCall = 0;
const ARXIV_DELAY_MS = 3000;

export interface AcademicResult {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  year: number | null;
  source: 'semantic_scholar' | 'arxiv';
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  authors: Array<{ name: string }>;
  year: number | null;
  url: string;
}

interface SemanticScholarResponse {
  data: SemanticScholarPaper[];
}

export async function searchSemanticScholar(
  query: string,
  maxResults: number = 5
): Promise<AcademicResult[]> {
  logger.info('research', 'Semantic Scholar search started', { query, maxResults });

  try {
    const params = new URLSearchParams({
      query,
      limit: String(maxResults),
      fields: 'paperId,title,abstract,authors,year,url',
    });

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Semantic Scholar API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as SemanticScholarResponse;

    const results: AcademicResult[] = (data.data || []).map((paper) => ({
      title: paper.title,
      authors: paper.authors.map((a) => a.name),
      abstract: paper.abstract || '',
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      year: paper.year,
      source: 'semantic_scholar' as const,
    }));

    logger.info('research', 'Semantic Scholar search complete', {
      query,
      resultCount: results.length,
    });

    return results;
  } catch (err) {
    logger.error('research', 'Semantic Scholar search failed', err as Error);
    throw err;
  }
}

export async function searchArxiv(
  query: string,
  maxResults: number = 5
): Promise<AcademicResult[]> {
  logger.info('research', 'arXiv search started', { query, maxResults });

  try {
    // Polite delay per arXiv guidelines
    const now = Date.now();
    const timeSinceLastCall = now - lastArxivCall;
    if (lastArxivCall > 0 && timeSinceLastCall < ARXIV_DELAY_MS) {
      await new Promise((r) => setTimeout(r, ARXIV_DELAY_MS - timeSinceLastCall));
    }
    lastArxivCall = Date.now();

    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: '0',
      max_results: String(maxResults),
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const response = await fetch(
      `https://export.arxiv.org/api/query?${params}`
    );

    if (!response.ok) {
      throw new Error(`arXiv API error ${response.status}`);
    }

    const xml = await response.text();
    const results = parseArxivXml(xml);

    logger.info('research', 'arXiv search complete', {
      query,
      resultCount: results.length,
    });

    return results;
  } catch (err) {
    logger.error('research', 'arXiv search failed', err as Error);
    throw err;
  }
}

function parseArxivXml(xml: string): AcademicResult[] {
  const results: AcademicResult[] = [];

  // Simple XML parsing — extract <entry> blocks
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const title = extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() || '';
    const abstract = extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim() || '';
    const published = extractTag(entry, 'published') || '';
    const year = published ? new Date(published).getFullYear() : null;

    // Extract link with type="text/html" or fallback to id
    const linkMatch = entry.match(/<link[^>]*href="([^"]*)"[^>]*title="pdf"/);
    const idUrl = extractTag(entry, 'id') || '';
    const url = linkMatch ? linkMatch[1] : idUrl;

    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    if (title) {
      results.push({
        title,
        authors,
        abstract,
        url,
        year,
        source: 'arxiv',
      });
    }
  }

  return results;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

export async function searchAcademic(
  query: string,
  sources?: ('semantic_scholar' | 'arxiv')[],
  maxResults: number = 5
): Promise<AcademicResult[]> {
  const activeSources = sources && sources.length > 0
    ? sources
    : ['semantic_scholar', 'arxiv'] as const;

  const promises: Promise<AcademicResult[]>[] = [];

  if (activeSources.includes('semantic_scholar')) {
    promises.push(
      searchSemanticScholar(query, maxResults).catch((err) => {
        logger.error('research', 'Semantic Scholar failed, continuing with other sources', err as Error);
        return [];
      })
    );
  }

  if (activeSources.includes('arxiv')) {
    promises.push(
      searchArxiv(query, maxResults).catch((err) => {
        logger.error('research', 'arXiv failed, continuing with other sources', err as Error);
        return [];
      })
    );
  }

  const allResults = await Promise.all(promises);
  return allResults.flat();
}
