import { describe, it, expect } from 'vitest';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';

describe('createErrorResponse', () => {
  it('returns correct JSON shape and status', async () => {
    const response = createErrorResponse('RESOURCE_NOT_FOUND', 'Not found', 404);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toEqual({
      error: { code: 'RESOURCE_NOT_FOUND', message: 'Not found' },
    });
  });
});

describe('createSuccessResponse', () => {
  it('returns data with 200 status by default', async () => {
    const response = createSuccessResponse({ id: '1', name: 'Test' });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ id: '1', name: 'Test' });
  });

  it('allows custom status code', async () => {
    const response = createSuccessResponse({ ok: true }, 201);
    expect(response.status).toBe(201);
  });
});
