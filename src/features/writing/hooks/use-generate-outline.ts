'use client';

import { useMutation } from '@tanstack/react-query';
import { generateOutline } from '../services';
import type { GenerateOutlineInput } from '../types';

export function useGenerateOutline() {
  return useMutation({
    mutationFn: (input: GenerateOutlineInput) => generateOutline(input),
  });
}
