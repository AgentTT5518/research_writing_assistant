'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishToLinkedIn } from '../services';

export function usePublishLinkedIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) => publishToLinkedIn(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
