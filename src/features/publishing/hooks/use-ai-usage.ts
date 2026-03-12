'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAiUsage } from '../services';

export function useAiUsage() {
  return useQuery({
    queryKey: ['ai-usage'],
    queryFn: fetchAiUsage,
  });
}
