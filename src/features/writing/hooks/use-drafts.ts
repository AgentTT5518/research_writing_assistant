'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDrafts } from '../services';
import type { DraftFilters } from '../services';

export function useDrafts(filters?: DraftFilters) {
  return useQuery({
    queryKey: ['drafts', filters],
    queryFn: () => fetchDrafts(filters),
    enabled: !!filters?.projectId,
  });
}
