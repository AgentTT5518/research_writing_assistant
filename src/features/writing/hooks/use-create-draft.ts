'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDraft } from '../services';
import type { CreateDraftInput } from '../types';

export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDraftInput) => createDraft(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
