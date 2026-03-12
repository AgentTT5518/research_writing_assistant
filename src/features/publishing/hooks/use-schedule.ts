'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSchedule } from '../services';

export function useSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['schedule', id],
    queryFn: () => fetchSchedule(id!),
    enabled: !!id,
  });
}
