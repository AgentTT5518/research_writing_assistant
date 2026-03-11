'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDraft } from '../services';

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
