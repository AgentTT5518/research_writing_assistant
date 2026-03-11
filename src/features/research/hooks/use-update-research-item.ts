'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateResearchItem } from '../services';

export function useUpdateResearchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; summary?: string | null; tagNames?: string[] } }) =>
      updateResearchItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-items'] });
    },
  });
}
