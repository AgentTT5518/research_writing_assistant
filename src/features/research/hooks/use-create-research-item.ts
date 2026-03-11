'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResearchItem } from '../services';
import type { CreateResearchItemInput } from '../types';

export function useCreateResearchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResearchItemInput) => createResearchItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-items'] });
    },
  });
}
