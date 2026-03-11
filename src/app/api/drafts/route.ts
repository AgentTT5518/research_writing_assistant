import { NextRequest } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftResearchLinks } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { createDraftSchema } from '@/features/writing/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const writingMode = searchParams.get('writingMode');

    const conditions = [];

    if (projectId) {
      conditions.push(eq(drafts.projectId, projectId));
    }
    if (status) {
      conditions.push(eq(drafts.status, status as typeof drafts.status.enumValues[number]));
    }
    if (writingMode) {
      conditions.push(eq(drafts.writingMode, writingMode as typeof drafts.writingMode.enumValues[number]));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const draftList = db
      .select()
      .from(drafts)
      .where(whereClause)
      .orderBy(desc(drafts.updatedAt))
      .all();

    return createSuccessResponse(draftList);
  } catch (err) {
    logger.error('writing', 'Failed to list drafts', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to list drafts', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createDraftSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { researchItemIds, ...draftData } = parsed.data;
    const now = new Date();

    const draft = {
      id: generateId(),
      ...draftData,
      status: 'draft' as const,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(drafts).values(draft).run();

    // Link research items
    if (researchItemIds && researchItemIds.length > 0) {
      for (const researchItemId of researchItemIds) {
        db.insert(draftResearchLinks)
          .values({ draftId: draft.id, researchItemId })
          .run();
      }
    }

    logger.info('writing', 'Draft created', { draftId: draft.id, writingMode: draft.writingMode });
    return createSuccessResponse(draft, 201);
  } catch (err) {
    logger.error('writing', 'Failed to create draft', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to create draft', 500);
  }
}
