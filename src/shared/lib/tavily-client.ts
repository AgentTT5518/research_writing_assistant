import { logger } from '@/shared/lib/logger';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilySearchOptions {
  maxResults?: number;
}

interface TavilyApiResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

const MAX_RETRIES = 2;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (attempt < retries && response.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      const body = await response.text();
      throw new Error(`Tavily API error ${response.status}: ${body}`);
    } catch (err) {
      if (attempt === retries) throw err;
      if (err instanceof Error && err.message.startsWith('Tavily API error')) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Tavily API: max retries exceeded');
}

export async function searchWeb(
  query: string,
  options?: TavilySearchOptions
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured');
  }

  const maxResults = options?.maxResults ?? 5;

  logger.info('research', 'Tavily web search started', { query, maxResults });

  const response = await fetchWithRetry(
    'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        include_answer: false,
      }),
    }
  );

  const data = (await response.json()) as TavilyApiResponse;

  const results: TavilyResult[] = (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }));

  logger.info('research', 'Tavily web search complete', {
    query,
    resultCount: results.length,
  });

  return results;
}
