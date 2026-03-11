import type { Project } from '@/shared/types';
import type { ProjectWithCounts, CreateProjectInput, UpdateProjectInput } from '../types';

const BASE_URL = '/api/projects';

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data as T;
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(BASE_URL);
  return handleResponse<Project[]>(response);
}

export async function fetchProject(id: string): Promise<ProjectWithCounts> {
  const response = await fetch(`${BASE_URL}/${id}`);
  return handleResponse<ProjectWithCounts>(response);
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ ok: boolean }>(response);
}
