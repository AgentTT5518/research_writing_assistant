'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelSchedule } from '../services';

export function useCancelSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
