'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { streamDraft } from '../services';
import type { GenerateDraftInput, SSEErrorEvent } from '../types';

const STREAM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useStreamDraft() {
  const queryClient = useQueryClient();
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<SSEErrorEvent | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const generate = useCallback(
    async (input: GenerateDraftInput) => {
      // Reset state
      setStreamedContent('');
      setError(null);
      setDraftId(null);
      setIsStreaming(true);

      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        abortController.abort();
        setError({ code: 'TIMEOUT', message: 'Request exceeded 5 minutes', partial: true });
        setIsStreaming(false);
      }, STREAM_TIMEOUT_MS);

      await streamDraft(input, {
        onChunk: (content) => {
          setStreamedContent((prev) => prev + content);
        },
        onDone: (metadata) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setDraftId(metadata.draftId);
          setIsStreaming(false);
          queryClient.invalidateQueries({ queryKey: ['drafts'] });
          queryClient.invalidateQueries({ queryKey: ['draft', metadata.draftId] });
        },
        onError: (err) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setError(err);
          setIsStreaming(false);
        },
        signal: abortController.signal,
      });
    },
    [queryClient],
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsStreaming(false);
  }, []);

  return { generate, abort, streamedContent, isStreaming, error, draftId };
}
