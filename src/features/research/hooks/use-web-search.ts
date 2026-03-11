'use client';

import { useMutation } from '@tanstack/react-query';
import { searchWeb } from '../services';

export function useWebSearch() {
  return useMutation({
    mutationFn: ({ query, projectId, maxResults }: { query: string; projectId: string; maxResults?: number }) =>
      searchWeb(query, projectId, maxResults),
  });
}
