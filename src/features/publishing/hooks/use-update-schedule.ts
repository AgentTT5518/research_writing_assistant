'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSchedule } from '../services';
import type { UpdateScheduleInput } from '../types';

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleInput }) =>
      updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
