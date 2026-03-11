'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adaptContent } from '../services';
import type { AdaptContentInput } from '../types';

export function useAdaptContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdaptContentInput) => adaptContent(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draft', variables.draftId] });
    },
  });
}
