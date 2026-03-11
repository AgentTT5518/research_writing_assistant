import { describe, it, expect } from 'vitest';
import { createSSEResponse } from '@/shared/lib/sse-utils';

async function readSSEStream(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }

  return chunks;
}

function parseSSEEvents(chunks: string[]): Array<{ event: string; data: unknown }> {
  const text = chunks.join('');
  const events: Array<{ event: string; data: unknown }> = [];
  const lines = text.split('\n');

  let currentEvent = '';
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7);
    } else if (line.startsWith('data: ') && currentEvent) {
      events.push({ event: currentEvent, data: JSON.parse(line.slice(6)) });
      currentEvent = '';
    }
  }

  return events;
}

describe('SSE Utils', () => {
  it('sets correct content-type header', () => {
    const request = new Request('http://localhost/test');
    const response = createSSEResponse(request, async (send) => {
      send.done({ draftId: 'test', tokensUsed: 0 });
    });

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('sends chunk events', async () => {
    const request = new Request('http://localhost/test');
    const response = createSSEResponse(request, async (send) => {
      send.chunk('Hello ');
      send.chunk('world');
      send.done({ draftId: 'draft-1', tokensUsed: 100 });
    });

    const chunks = await readSSEStream(response);
    const events = parseSSEEvents(chunks);

    const chunkEvents = events.filter((e) => e.event === 'chunk');
    expect(chunkEvents).toHaveLength(2);
    expect((chunkEvents[0].data as { content: string }).content).toBe('Hello ');
    expect((chunkEvents[1].data as { content: string }).content).toBe('world');
  });

  it('sends done event with metadata', async () => {
    const request = new Request('http://localhost/test');
    const response = createSSEResponse(request, async (send) => {
      send.done({ draftId: 'draft-1', tokensUsed: 500 });
    });

    const chunks = await readSSEStream(response);
    const events = parseSSEEvents(chunks);

    const doneEvents = events.filter((e) => e.event === 'done');
    expect(doneEvents).toHaveLength(1);
    const data = doneEvents[0].data as { draftId: string; tokensUsed: number; status: string };
    expect(data.draftId).toBe('draft-1');
    expect(data.tokensUsed).toBe(500);
    expect(data.status).toBe('complete');
  });

  it('sends error event', async () => {
    const request = new Request('http://localhost/test');
    const response = createSSEResponse(request, async (send) => {
      send.error({ code: 'TEST_ERROR', message: 'Something went wrong', partial: true });
    });

    const chunks = await readSSEStream(response);
    const events = parseSSEEvents(chunks);

    const errorEvents = events.filter((e) => e.event === 'error');
    expect(errorEvents).toHaveLength(1);
    const data = errorEvents[0].data as { code: string; message: string; partial: boolean };
    expect(data.code).toBe('TEST_ERROR');
    expect(data.partial).toBe(true);
  });

  it('catches handler errors and sends error event', async () => {
    const request = new Request('http://localhost/test');
    const response = createSSEResponse(request, async () => {
      throw new Error('Handler crashed');
    });

    const chunks = await readSSEStream(response);
    const events = parseSSEEvents(chunks);

    const errorEvents = events.filter((e) => e.event === 'error');
    expect(errorEvents).toHaveLength(1);
    const data = errorEvents[0].data as { code: string; message: string };
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toBe('Handler crashed');
  });
});
