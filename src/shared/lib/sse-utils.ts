/**
 * Server-Sent Events (SSE) response utilities.
 * Used by streaming AI writing endpoints.
 */

export interface SSESender {
  chunk: (content: string) => void;
  done: (metadata: { draftId: string; tokensUsed: number }) => void;
  error: (error: { code: string; message: string; partial: boolean }) => void;
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
} as const;

const KEEPALIVE_INTERVAL_MS = 15_000;

/**
 * Creates an SSE Response from an async handler function.
 * Includes keepalive events every 15s and abort detection.
 */
export function createSSEResponse(
  request: Request,
  handler: (send: SSESender) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Controller may be closed
        }
      };

      // Keepalive to prevent proxy timeouts
      keepaliveTimer = setInterval(() => {
        send('keepalive', { timestamp: Date.now() });
      }, KEEPALIVE_INTERVAL_MS);

      // Clean up on client disconnect
      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }, { once: true });
      }

      const sender: SSESender = {
        chunk: (content) => send('chunk', { content }),
        done: (metadata) => {
          send('done', { ...metadata, status: 'complete' });
          cleanup();
          controller.close();
        },
        error: (error) => {
          send('error', error);
          cleanup();
          controller.close();
        },
      };

      try {
        await handler(sender);
      } catch (err) {
        sender.error({
          code: 'INTERNAL_ERROR',
          message: (err as Error).message,
          partial: false,
        });
      }
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
  }

  return new Response(stream, { headers: SSE_HEADERS });
}
