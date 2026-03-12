'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSchedule } from '../services';
import type { CreateScheduleInput } from '../types';

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleInput) => createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
