'use client';

import { useMutation } from '@tanstack/react-query';
import { searchAcademic } from '../services';

export function useAcademicSearch() {
  return useMutation({
    mutationFn: ({
      query,
      projectId,
      sources,
      maxResults,
    }: {
      query: string;
      projectId: string;
      sources?: ('semantic_scholar' | 'arxiv')[];
      maxResults?: number;
    }) => searchAcademic(query, projectId, sources, maxResults),
  });
}
