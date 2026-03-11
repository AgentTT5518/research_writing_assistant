'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scrapeUrl } from '../services';

export function useUrlScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ url, projectId }: { url: string; projectId: string }) =>
      scrapeUrl(url, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-items'] });
    },
  });
}
