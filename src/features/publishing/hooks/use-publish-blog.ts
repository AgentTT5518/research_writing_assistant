'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishToBlog } from '../services';

export function usePublishBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) => publishToBlog(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
