import type { Schedule } from '@/shared/types/database';
import type {
  ScheduleWithDraft,
  CreateScheduleInput,
  UpdateScheduleInput,
  ConfigResponse,
} from '../types';

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data as T;
}

// ─── Schedule API ───

export async function fetchSchedules(filters?: {
  status?: string;
  platform?: string;
  draftId?: string;
}): Promise<ScheduleWithDraft[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.draftId) params.set('draftId', filters.draftId);

  const qs = params.toString();
  const response = await fetch(`/api/schedule${qs ? `?${qs}` : ''}`);
  return handleResponse<ScheduleWithDraft[]>(response);
}

export async function fetchSchedule(id: string): Promise<Schedule> {
  const response = await fetch(`/api/schedule/${id}`);
  return handleResponse<Schedule>(response);
}

export async function createSchedule(data: CreateScheduleInput): Promise<Schedule> {
  const response = await fetch('/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Schedule>(response);
}

export async function updateSchedule(id: string, data: UpdateScheduleInput): Promise<Schedule> {
  const response = await fetch(`/api/schedule/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Schedule>(response);
}

export async function cancelSchedule(id: string): Promise<{ ok: boolean }> {
  const response = await fetch(`/api/schedule/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ ok: boolean }>(response);
}

// ─── Publish API ───

export async function publishToBlog(draftId: string): Promise<{ postId: string; url: string }> {
  const response = await fetch('/api/publish/blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId }),
  });
  return handleResponse<{ postId: string; url: string }>(response);
}

export async function publishToLinkedIn(draftId: string): Promise<{ postUrl: string }> {
  const response = await fetch('/api/publish/linkedin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId }),
  });
  return handleResponse<{ postUrl: string }>(response);
}

// ─── Config API ───

export async function fetchConfig(): Promise<ConfigResponse> {
  const response = await fetch('/api/config');
  return handleResponse<ConfigResponse>(response);
}

export async function updateConfig(key: string, value: unknown): Promise<{ ok: boolean }> {
  const response = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  return handleResponse<{ ok: boolean }>(response);
}

// ─── AI Usage API ───

export interface AiUsageRow {
  feature: string;
  month: string;
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
}

export interface AiUsageResponse {
  usage: AiUsageRow[];
  totals: {
    totalRequests: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostUsd: number;
  };
}

export async function fetchAiUsage(): Promise<AiUsageResponse> {
  const response = await fetch('/api/ai-usage');
  return handleResponse<AiUsageResponse>(response);
}
