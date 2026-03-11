import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchWeb } from '@/shared/lib/tavily-client';

describe('Tavily Client', () => {
  const originalEnv = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    process.env.TAVILY_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.TAVILY_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws when API key is not configured', async () => {
    delete process.env.TAVILY_API_KEY;
    await expect(searchWeb('test')).rejects.toThrow('TAVILY_API_KEY is not configured');
  });

  it('returns parsed search results', async () => {
    const mockResults = {
      results: [
        { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1', score: 0.95 },
        { title: 'Result 2', url: 'https://example.com/2', content: 'Content 2', score: 0.85 },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResults), { status: 200 })
    );

    const results = await searchWeb('test query');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'Result 1',
      url: 'https://example.com/1',
      content: 'Content 1',
      score: 0.95,
    });
  });

  it('sends correct request parameters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    await searchWeb('test query', { maxResults: 10 });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"max_results":10'),
      })
    );
  });

  it('handles empty results gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    const results = await searchWeb('no results query');
    expect(results).toEqual([]);
  });

  it('throws on non-retryable API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Bad Request', { status: 400 })
    );

    await expect(searchWeb('test')).rejects.toThrow('Tavily API error 400');
  });
});
