import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchSemanticScholar, searchArxiv, searchAcademic } from '@/shared/lib/academic-client';

describe('Academic Client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchSemanticScholar', () => {
    it('returns parsed results from Semantic Scholar', async () => {
      const mockResponse = {
        data: [
          {
            paperId: 'abc123',
            title: 'Deep Learning Paper',
            abstract: 'An abstract about DL',
            authors: [{ name: 'Alice' }, { name: 'Bob' }],
            year: 2024,
            url: 'https://semanticscholar.org/paper/abc123',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const results = await searchSemanticScholar('deep learning');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Deep Learning Paper',
        authors: ['Alice', 'Bob'],
        abstract: 'An abstract about DL',
        url: 'https://semanticscholar.org/paper/abc123',
        year: 2024,
        source: 'semantic_scholar',
      });
    });

    it('throws on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Rate limited', { status: 429 })
      );

      await expect(searchSemanticScholar('test')).rejects.toThrow('Semantic Scholar API error 429');
    });
  });

  describe('searchArxiv', () => {
    it('parses arXiv XML response correctly', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed>
  <entry>
    <id>http://arxiv.org/abs/2301.12345</id>
    <title>Transformer Models for NLP</title>
    <summary>A comprehensive review of transformer architectures.</summary>
    <published>2023-01-15T00:00:00Z</published>
    <author><name>Jane Doe</name></author>
    <author><name>John Smith</name></author>
    <link href="http://arxiv.org/pdf/2301.12345" title="pdf" />
  </entry>
</feed>`;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(mockXml, { status: 200 })
      );

      const results = await searchArxiv('transformers NLP');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Transformer Models for NLP');
      expect(results[0].authors).toEqual(['Jane Doe', 'John Smith']);
      expect(results[0].year).toBe(2023);
      expect(results[0].source).toBe('arxiv');
    });

    it('handles empty feed', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><feed></feed>`;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(emptyXml, { status: 200 })
      );

      const results = await searchArxiv('nothing');
      expect(results).toEqual([]);
    });
  });

  describe('searchAcademic', () => {
    it('combines results from both sources', async () => {
      const semanticResponse = {
        data: [{
          paperId: 's1', title: 'S Scholar Paper', abstract: 'Abstract',
          authors: [{ name: 'Author' }], year: 2024, url: 'https://ss.org/s1',
        }],
      };

      const arxivXml = `<feed><entry>
        <id>http://arxiv.org/abs/2301.00001</id>
        <title>ArXiv Paper</title>
        <summary>Abstract</summary>
        <published>2023-01-01T00:00:00Z</published>
        <author><name>Writer</name></author>
      </entry></feed>`;

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify(semanticResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(arxivXml, { status: 200 }));

      const results = await searchAcademic('test query');

      expect(results).toHaveLength(2);
      expect(results.some((r) => r.source === 'semantic_scholar')).toBe(true);
      expect(results.some((r) => r.source === 'arxiv')).toBe(true);
    });

    it('continues when one source fails', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response(`<feed><entry>
            <id>http://arxiv.org/abs/2301.00001</id>
            <title>ArXiv Paper</title>
            <summary>Abstract</summary>
            <published>2023-01-01T00:00:00Z</published>
            <author><name>Writer</name></author>
          </entry></feed>`, { status: 200 })
        );

      const results = await searchAcademic('test');

      // Should have arXiv result even though Semantic Scholar failed
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.source === 'arxiv')).toBe(true);
    });

    it('filters by specific source', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(`<feed><entry>
          <id>http://arxiv.org/abs/2301.00001</id>
          <title>ArXiv Only</title>
          <summary>Abstract</summary>
          <published>2023-01-01T00:00:00Z</published>
          <author><name>Writer</name></author>
        </entry></feed>`, { status: 200 })
      );

      const results = await searchAcademic('test', ['arxiv']);

      // Should only call arXiv, not Semantic Scholar
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(results.every((r) => r.source === 'arxiv')).toBe(true);
    });
  });
});
