/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the services module
vi.mock('@/features/publishing/services', () => ({
  fetchSchedules: vi.fn(),
  fetchSchedule: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  cancelSchedule: vi.fn(),
  publishToBlog: vi.fn(),
  publishToLinkedIn: vi.fn(),
  fetchConfig: vi.fn(),
  updateConfig: vi.fn(),
  fetchAiUsage: vi.fn(),
}));

import * as services from '@/features/publishing/services';
import { useSchedules } from '@/features/publishing/hooks/use-schedules';
import { useSchedule } from '@/features/publishing/hooks/use-schedule';
import { useCreateSchedule } from '@/features/publishing/hooks/use-create-schedule';
import { usePublishBlog } from '@/features/publishing/hooks/use-publish-blog';
import { usePublishLinkedIn } from '@/features/publishing/hooks/use-publish-linkedin';
import { useConfig, useUpdateConfig } from '@/features/publishing/hooks/use-config';
import { useCancelSchedule } from '@/features/publishing/hooks/use-cancel-schedule';
import { useAiUsage } from '@/features/publishing/hooks/use-ai-usage';

const mockedServices = vi.mocked(services);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('publishing hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSchedules', () => {
    it('calls fetchSchedules and returns data', async () => {
      mockedServices.fetchSchedules.mockResolvedValueOnce([
        { id: 's1', draftTitle: 'Test' } as never,
      ]);

      const { result } = renderHook(() => useSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.fetchSchedules).toHaveBeenCalledWith(undefined);
      expect(result.current.data).toHaveLength(1);
    });

    it('passes filters to fetchSchedules', async () => {
      mockedServices.fetchSchedules.mockResolvedValueOnce([]);
      const filters = { status: 'pending', platform: 'blog' };

      const { result } = renderHook(() => useSchedules(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.fetchSchedules).toHaveBeenCalledWith(filters);
    });
  });

  describe('useSchedule', () => {
    it('fetches schedule by id when id is provided', async () => {
      mockedServices.fetchSchedule.mockResolvedValueOnce({ id: 's1' } as never);

      const { result } = renderHook(() => useSchedule('s1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.fetchSchedule).toHaveBeenCalledWith('s1');
    });

    it('does not fetch when id is undefined', () => {
      const { result } = renderHook(() => useSchedule(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(mockedServices.fetchSchedule).not.toHaveBeenCalled();
    });
  });

  describe('useCreateSchedule', () => {
    it('calls createSchedule and invalidates queries on success', async () => {
      mockedServices.createSchedule.mockResolvedValueOnce({ id: 's1' } as never);
      const wrapper = createWrapper();

      const { result } = renderHook(() => useCreateSchedule(), { wrapper });

      result.current.mutate({
        draftId: 'd1',
        platform: 'blog',
        scheduledAt: '2026-04-01T10:00:00Z',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.createSchedule).toHaveBeenCalled();
    });
  });

  describe('useCancelSchedule', () => {
    it('calls cancelSchedule', async () => {
      mockedServices.cancelSchedule.mockResolvedValueOnce({ ok: true });
      const wrapper = createWrapper();

      const { result } = renderHook(() => useCancelSchedule(), { wrapper });

      result.current.mutate('s1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.cancelSchedule).toHaveBeenCalledWith('s1');
    });
  });

  describe('usePublishBlog', () => {
    it('calls publishToBlog', async () => {
      mockedServices.publishToBlog.mockResolvedValueOnce({ postId: 'p1', url: 'https://blog.com/p1' });
      const wrapper = createWrapper();

      const { result } = renderHook(() => usePublishBlog(), { wrapper });

      result.current.mutate('d1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.publishToBlog).toHaveBeenCalledWith('d1');
    });
  });

  describe('usePublishLinkedIn', () => {
    it('calls publishToLinkedIn', async () => {
      mockedServices.publishToLinkedIn.mockResolvedValueOnce({ postUrl: 'https://li.com/123' });
      const wrapper = createWrapper();

      const { result } = renderHook(() => usePublishLinkedIn(), { wrapper });

      result.current.mutate('d1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.publishToLinkedIn).toHaveBeenCalledWith('d1');
    });
  });

  describe('useConfig', () => {
    it('fetches config data', async () => {
      const configData = {
        config: {},
        envStatus: { anthropic: true, tavily: true, firebase: false, linkedinClient: false },
        linkedinConnected: false,
        schedulerRunning: false,
      };
      mockedServices.fetchConfig.mockResolvedValueOnce(configData);

      const { result } = renderHook(() => useConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(configData);
    });
  });

  describe('useUpdateConfig', () => {
    it('calls updateConfig', async () => {
      mockedServices.updateConfig.mockResolvedValueOnce({ ok: true });
      const wrapper = createWrapper();

      const { result } = renderHook(() => useUpdateConfig(), { wrapper });

      result.current.mutate({ key: 'ai_model', value: 'claude-3' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedServices.updateConfig).toHaveBeenCalledWith('ai_model', 'claude-3');
    });
  });

  describe('useAiUsage', () => {
    it('fetches AI usage data', async () => {
      const usageData = {
        usage: [{ feature: 'research', month: '2026-03', totalRequests: 5, totalPromptTokens: 1000, totalCompletionTokens: 500, totalCostUsd: 0.05 }],
        totals: { totalRequests: 5, totalPromptTokens: 1000, totalCompletionTokens: 500, totalCostUsd: 0.05 },
      };
      mockedServices.fetchAiUsage.mockResolvedValueOnce(usageData);

      const { result } = renderHook(() => useAiUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.usage).toHaveLength(1);
      expect(result.current.data?.totals.totalRequests).toBe(5);
    });
  });
});
