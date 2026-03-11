import type { Draft, DraftVersion } from '@/shared/types';
import type {
  DraftWithVersions,
  CreateDraftInput,
  UpdateDraftInput,
  GenerateDraftInput,
  GenerateOutlineInput,
  ExpandOutlineInput,
  CoWriteInput,
  AdaptContentInput,
  ReviewContentInput,
  Outline,
  AntiSlopReport,
} from '../types';

const DRAFTS_URL = '/api/drafts';
const WRITE_URL = '/api/write';

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data as T;
}

// ─── Draft CRUD ───

export interface DraftFilters {
  projectId?: string;
  status?: string;
  writingMode?: string;
}

export async function fetchDrafts(filters?: DraftFilters): Promise<Draft[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.writingMode) params.set('writingMode', filters.writingMode);

  const queryString = params.toString();
  const url = queryString ? `${DRAFTS_URL}?${queryString}` : DRAFTS_URL;

  const response = await fetch(url);
  return handleResponse<Draft[]>(response);
}

export async function fetchDraft(id: string): Promise<DraftWithVersions> {
  const response = await fetch(`${DRAFTS_URL}/${id}`);
  return handleResponse<DraftWithVersions>(response);
}

export async function createDraft(data: CreateDraftInput): Promise<Draft> {
  const response = await fetch(DRAFTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Draft>(response);
}

export async function updateDraft(
  id: string,
  data: UpdateDraftInput,
): Promise<Draft> {
  const response = await fetch(`${DRAFTS_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Draft>(response);
}

export async function deleteDraft(id: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${DRAFTS_URL}/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ ok: boolean }>(response);
}

export async function fetchDraftVersions(draftId: string): Promise<DraftVersion[]> {
  const response = await fetch(`${DRAFTS_URL}/${draftId}/versions`);
  return handleResponse<DraftVersion[]>(response);
}

export async function uploadCoverImage(
  draftId: string,
  file: File,
): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${DRAFTS_URL}/${draftId}/image`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<{ path: string }>(response);
}

// ─── Streaming Operations ───

export interface StreamOptions {
  onChunk: (content: string) => void;
  onDone: (metadata: { draftId: string; tokensUsed: number }) => void;
  onError: (error: { code: string; message: string; partial: boolean }) => void;
  signal?: AbortSignal;
}

async function consumeSSEStream(
  response: Response,
  options: StreamOptions,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    options.onError({ code: 'STREAM_ERROR', message: 'No response body', partial: false });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (eventType) {
              case 'chunk':
                options.onChunk(data.content);
                break;
              case 'done':
                options.onDone({ draftId: data.draftId, tokensUsed: data.tokensUsed });
                break;
              case 'error':
                options.onError(data);
                break;
              case 'keepalive':
                // Ignore keepalive events
                break;
            }
          } catch {
            // Ignore malformed JSON
          }
          eventType = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamDraft(
  input: GenerateDraftInput,
  options: StreamOptions,
): Promise<void> {
  const response = await fetch(`${WRITE_URL}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    const data = await response.json();
    options.onError({
      code: data.error?.code ?? 'REQUEST_FAILED',
      message: data.error?.message ?? 'Request failed',
      partial: false,
    });
    return;
  }

  await consumeSSEStream(response, options);
}

export async function streamExpand(
  input: ExpandOutlineInput,
  options: StreamOptions,
): Promise<void> {
  const response = await fetch(`${WRITE_URL}/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    const data = await response.json();
    options.onError({
      code: data.error?.code ?? 'REQUEST_FAILED',
      message: data.error?.message ?? 'Request failed',
      partial: false,
    });
    return;
  }

  await consumeSSEStream(response, options);
}

export async function streamCoWrite(
  input: CoWriteInput,
  options: StreamOptions,
): Promise<void> {
  const response = await fetch(`${WRITE_URL}/co-write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    const data = await response.json();
    options.onError({
      code: data.error?.code ?? 'REQUEST_FAILED',
      message: data.error?.message ?? 'Request failed',
      partial: false,
    });
    return;
  }

  await consumeSSEStream(response, options);
}

// ─── Non-Streaming Operations ───

export async function generateOutline(input: GenerateOutlineInput): Promise<Outline> {
  const response = await fetch(`${WRITE_URL}/outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Outline>(response);
}

export async function adaptContent(input: AdaptContentInput): Promise<Draft> {
  const response = await fetch(`${WRITE_URL}/adapt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Draft>(response);
}

export async function reviewDraftContent(input: ReviewContentInput): Promise<AntiSlopReport> {
  const response = await fetch(`${WRITE_URL}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<AntiSlopReport>(response);
}
