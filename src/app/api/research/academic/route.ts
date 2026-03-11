import { NextRequest } from 'next/server';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { searchAcademic } from '@/shared/lib/academic-client';
import { academicSearchSchema } from '@/features/research/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = academicSearchSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { query, sources, maxResults } = parsed.data;

    const results = await searchAcademic(query, sources, maxResults);

    logger.info('research', 'Academic search completed', {
      query,
      sources: sources || ['semantic_scholar', 'arxiv'],
      resultCount: results.length,
    });

    return createSuccessResponse(results);
  } catch (err) {
    logger.error('research', 'Academic search failed', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Academic search failed', 500);
  }
}
