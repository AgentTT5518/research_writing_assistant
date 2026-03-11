'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadCoverImage } from '../services';

export function useUploadCoverImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, file }: { draftId: string; file: File }) =>
      uploadCoverImage(draftId, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draft', variables.draftId] });
    },
  });
}
