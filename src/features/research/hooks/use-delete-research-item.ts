'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteResearchItem } from '../services';

export function useDeleteResearchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResearchItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-items'] });
    },
  });
}
