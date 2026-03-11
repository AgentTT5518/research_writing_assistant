'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewDraftContent } from '../services';
import type { ReviewContentInput } from '../types';

export function useReviewContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReviewContentInput) => reviewDraftContent(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draft', variables.draftId] });
    },
  });
}
