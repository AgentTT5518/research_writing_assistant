import { NextRequest } from 'next/server';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { searchWeb } from '@/shared/lib/tavily-client';
import { webSearchSchema } from '@/features/research/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = webSearchSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { query, maxResults } = parsed.data;

    const results = await searchWeb(query, { maxResults });

    logger.info('research', 'Web search completed', {
      query,
      resultCount: results.length,
    });

    return createSuccessResponse(results);
  } catch (err) {
    logger.error('research', 'Web search failed', err as Error);

    const message = err instanceof Error ? err.message : 'Web search failed';
    if (message.includes('TAVILY_API_KEY')) {
      return createErrorResponse('BAD_REQUEST', 'Tavily API key is not configured', 400);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Web search failed', 500);
  }
}
