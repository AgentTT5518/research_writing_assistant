'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDraft } from '../services';

export function useDraft(id: string) {
  return useQuery({
    queryKey: ['draft', id],
    queryFn: () => fetchDraft(id),
    enabled: !!id,
  });
}
