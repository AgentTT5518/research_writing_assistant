import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { tick } from '@/shared/lib/scheduler';

/**
 * Internal cron tick endpoint.
 * Called by node-cron or manually for testing.
 * Processes due schedules and returns count.
 */
export async function POST() {
  try {
    const result = await tick();
    return createSuccessResponse(result);
  } catch (err) {
    logger.error('publishing:api', 'Cron tick failed', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Cron tick failed', 500);
  }
}
