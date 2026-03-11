import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftVersions } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    // Verify draft exists
    const draft = db.select().from(drafts).where(eq(drafts.id, id)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${id} not found`, 404);
    }

    const versions = db
      .select()
      .from(draftVersions)
      .where(eq(draftVersions.draftId, id))
      .orderBy(desc(draftVersions.versionNumber))
      .all();

    return createSuccessResponse(versions);
  } catch (err) {
    logger.error('writing', 'Failed to list draft versions', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to list draft versions', 500);
  }
}
