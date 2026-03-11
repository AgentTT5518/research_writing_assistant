import type { ResearchItem } from '@/shared/types';
import type { ResearchItemWithTags, CreateResearchItemInput } from '../types';
import type { TavilyResult } from '@/shared/lib/tavily-client';
import type { AcademicResult } from '@/shared/lib/academic-client';

const BASE_URL = '/api/research';

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data as T;
}

// ─── CRUD ───

export interface ResearchFilters {
  projectId?: string;
  sourceType?: string;
  search?: string;
}

export async function fetchResearchItems(
  filters?: ResearchFilters
): Promise<ResearchItemWithTags[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set('projectId', filters.projectId);
  if (filters?.sourceType) params.set('sourceType', filters.sourceType);
  if (filters?.search) params.set('search', filters.search);

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  const response = await fetch(url);
  return handleResponse<ResearchItemWithTags[]>(response);
}

export async function fetchResearchItem(id: string): Promise<ResearchItemWithTags> {
  const response = await fetch(`${BASE_URL}/${id}`);
  return handleResponse<ResearchItemWithTags>(response);
}

export async function createResearchItem(
  data: CreateResearchItemInput
): Promise<ResearchItemWithTags> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ResearchItemWithTags>(response);
}

export async function updateResearchItem(
  id: string,
  data: { title?: string; summary?: string | null; tagNames?: string[] }
): Promise<ResearchItemWithTags> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ResearchItemWithTags>(response);
}

export async function deleteResearchItem(id: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ ok: boolean }>(response);
}

// ─── Search / Scrape / Academic ───

export async function searchWeb(
  query: string,
  projectId: string,
  maxResults?: number
): Promise<TavilyResult[]> {
  const response = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, projectId, maxResults }),
  });
  return handleResponse<TavilyResult[]>(response);
}

export async function scrapeUrl(
  url: string,
  projectId: string
): Promise<ResearchItem> {
  const response = await fetch(`${BASE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, projectId }),
  });
  return handleResponse<ResearchItem>(response);
}

export async function searchAcademic(
  query: string,
  projectId: string,
  sources?: ('semantic_scholar' | 'arxiv')[],
  maxResults?: number
): Promise<AcademicResult[]> {
  const response = await fetch(`${BASE_URL}/academic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, projectId, sources, maxResults }),
  });
  return handleResponse<AcademicResult[]>(response);
}
