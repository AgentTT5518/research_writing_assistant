'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchResearchItems } from '../services';
import type { ResearchFilters } from '../services';

export function useResearchItems(filters?: ResearchFilters) {
  return useQuery({
    queryKey: ['research-items', filters],
    queryFn: () => fetchResearchItems(filters),
    enabled: !!filters?.projectId,
  });
}
