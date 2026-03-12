'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSchedules } from '../services';

export function useSchedules(filters?: {
  status?: string;
  platform?: string;
  draftId?: string;
}) {
  return useQuery({
    queryKey: ['schedules', filters],
    queryFn: () => fetchSchedules(filters),
  });
}
