'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchResearchItem } from '../services';

export function useResearchItem(id: string) {
  return useQuery({
    queryKey: ['research-items', id],
    queryFn: () => fetchResearchItem(id),
    enabled: !!id,
  });
}
