import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, schedules } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { publishLinkedInSchema } from '@/features/publishing/types';
import { publishLinkedInPost } from '@/shared/lib/linkedin-client';
import { validateLinkedInContent } from '@/shared/lib/validate-content';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publishLinkedInSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.errors[0].message, 400);
    }

    const { draftId } = parsed.data;

    // Fetch and validate draft
    const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
    }

    if (draft.status !== 'approved' && draft.status !== 'scheduled') {
      return createErrorResponse(
        'INVALID_STATE',
        `Draft must be approved or scheduled to publish (current: ${draft.status})`,
        400
      );
    }

    if (!draft.linkedinContent) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'LinkedIn content is required for LinkedIn publishing',
        400
      );
    }

    // Validate content
    const validation = validateLinkedInContent(draft.linkedinContent);
    if (!validation.valid) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `LinkedIn content validation failed: ${validation.issues.join('; ')}`,
        400
      );
    }

    logger.info('publishing:api', 'LinkedIn publish started', { draftId });

    // Publish to LinkedIn
    const imagePath = draft.coverImagePath?.startsWith('data/')
      ? draft.coverImagePath
      : undefined;

    const { postUrl } = await publishLinkedInPost(draft.linkedinContent, imagePath);

    // Update draft status
    db.update(drafts)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(drafts.id, draftId))
      .run();

    // Update related schedule if exists
    const relatedSchedule = db
      .select()
      .from(schedules)
      .where(eq(schedules.draftId, draftId))
      .get();

    if (relatedSchedule && relatedSchedule.status === 'pending') {
      db.update(schedules)
        .set({
          status: 'published',
          publishedUrl: postUrl,
          publishedAt: new Date(),
        })
        .where(eq(schedules.id, relatedSchedule.id))
        .run();
    }

    logger.info('publishing:api', 'LinkedIn post published successfully', { draftId, postUrl });

    return createSuccessResponse({ postUrl }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'LINKEDIN_NOT_CONNECTED') {
      return createErrorResponse('LINKEDIN_NOT_CONNECTED', 'LinkedIn account is not connected', 400);
    }

    if (message === 'LINKEDIN_TOKEN_EXPIRED') {
      return createErrorResponse('LINKEDIN_TOKEN_EXPIRED', 'LinkedIn connection expired — please reconnect', 401);
    }

    logger.error('publishing:api', 'LinkedIn publish failed', err as Error);
    return createErrorResponse('PUBLISH_FAILED', 'Failed to publish LinkedIn post', 500);
  }
}
