'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDraft } from '../services';
import type { UpdateDraftInput } from '../types';

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDraftInput }) =>
      updateDraft(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['draft', variables.id] });
    },
  });
}
