import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  fetchSchedules,
  fetchSchedule,
  createSchedule,
  updateSchedule,
  cancelSchedule,
  publishToBlog,
  publishToLinkedIn,
  fetchConfig,
  updateConfig,
  fetchAiUsage,
} from '@/features/publishing/services/publishing-api';

function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('publishing-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSchedules', () => {
    it('fetches schedules without filters', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([{ id: 's1' }]));
      const result = await fetchSchedules();
      expect(mockFetch).toHaveBeenCalledWith('/api/schedule');
      expect(result).toEqual([{ id: 's1' }]);
    });

    it('appends query params when filters are provided', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await fetchSchedules({ status: 'pending', platform: 'blog' });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('status=pending');
      expect(url).toContain('platform=blog');
    });
  });

  describe('fetchSchedule', () => {
    it('fetches a single schedule by id', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ id: 's1', status: 'pending' }));
      const result = await fetchSchedule('s1');
      expect(mockFetch).toHaveBeenCalledWith('/api/schedule/s1');
      expect(result).toEqual({ id: 's1', status: 'pending' });
    });
  });

  describe('createSchedule', () => {
    it('sends POST with schedule data', async () => {
      const input = { draftId: 'd1', platform: 'blog' as const, scheduledAt: '2026-04-01T10:00:00Z' };
      mockFetch.mockResolvedValueOnce(mockResponse({ id: 's1', ...input }));
      const result = await createSchedule(input);
      expect(mockFetch).toHaveBeenCalledWith('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      expect(result.id).toBe('s1');
    });
  });

  describe('updateSchedule', () => {
    it('sends PUT with updated data', async () => {
      const data = { scheduledAt: '2026-05-01T10:00:00Z' };
      mockFetch.mockResolvedValueOnce(mockResponse({ id: 's1', ...data }));
      await updateSchedule('s1', data);
      expect(mockFetch).toHaveBeenCalledWith('/api/schedule/s1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    });
  });

  describe('cancelSchedule', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));
      const result = await cancelSchedule('s1');
      expect(mockFetch).toHaveBeenCalledWith('/api/schedule/s1', { method: 'DELETE' });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('publishToBlog', () => {
    it('sends POST with draftId', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ postId: 'p1', url: 'https://blog.com/posts/p1' }));
      const result = await publishToBlog('d1');
      expect(mockFetch).toHaveBeenCalledWith('/api/publish/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: 'd1' }),
      });
      expect(result.postId).toBe('p1');
      expect(result.url).toBe('https://blog.com/posts/p1');
    });
  });

  describe('publishToLinkedIn', () => {
    it('sends POST with draftId', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ postUrl: 'https://linkedin.com/posts/123' }));
      const result = await publishToLinkedIn('d1');
      expect(result.postUrl).toBe('https://linkedin.com/posts/123');
    });
  });

  describe('fetchConfig', () => {
    it('fetches config data', async () => {
      const config = {
        config: { ai_model: 'claude' },
        envStatus: { anthropic: true },
        linkedinConnected: false,
        schedulerRunning: true,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(config));
      const result = await fetchConfig();
      expect(mockFetch).toHaveBeenCalledWith('/api/config');
      expect(result.envStatus.anthropic).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('sends PUT with key-value', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }));
      await updateConfig('ai_model', 'claude-3');
      expect(mockFetch).toHaveBeenCalledWith('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_model', value: 'claude-3' }),
      });
    });
  });

  describe('fetchAiUsage', () => {
    it('fetches AI usage data', async () => {
      const usageData = {
        usage: [{ feature: 'research', month: '2026-03', totalRequests: 5, totalPromptTokens: 1000, totalCompletionTokens: 500, totalCostUsd: 0.05 }],
        totals: { totalRequests: 5, totalPromptTokens: 1000, totalCompletionTokens: 500, totalCostUsd: 0.05 },
      };
      mockFetch.mockResolvedValueOnce(mockResponse(usageData));
      const result = await fetchAiUsage();
      expect(mockFetch).toHaveBeenCalledWith('/api/ai-usage');
      expect(result.usage).toHaveLength(1);
      expect(result.totals.totalRequests).toBe(5);
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response with error message', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ error: { message: 'Not found' } }, false, 404)
      );
      await expect(fetchSchedule('bad-id')).rejects.toThrow('Not found');
    });

    it('throws generic message when no error detail', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, false, 500));
      await expect(fetchSchedule('bad-id')).rejects.toThrow('Request failed');
    });
  });
});
