import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftVersions } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { reviewContentSchema } from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';
import { reviewContent } from '@/shared/lib/ai-client';

const MAX_ESTIMATED_TOKENS = 180_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reviewContentSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { draftId } = parsed.data;

    // Verify draft exists
    const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
    }

    // Determine content type and get content
    const draftContent = draft.linkedinContent ?? draft.blogContent;
    const contentType = draft.linkedinContent ? 'linkedin' : 'blog';

    if (!draftContent) {
      return createErrorResponse('VALIDATION_ERROR', 'Draft has no content to review', 400);
    }

    // Set status to reviewing
    db.update(drafts)
      .set({ status: 'reviewing' as const, updatedAt: new Date() })
      .where(eq(drafts.id, draftId))
      .run();

    // Create pre-review version snapshot
    const existingVersions = db
      .select()
      .from(draftVersions)
      .where(eq(draftVersions.draftId, draftId))
      .orderBy(desc(draftVersions.versionNumber))
      .all();

    const nextVersionNumber = existingVersions.length > 0
      ? existingVersions[0].versionNumber + 1
      : 1;

    db.insert(draftVersions)
      .values({
        id: generateId(),
        draftId,
        versionNumber: nextVersionNumber,
        linkedinContent: draft.linkedinContent,
        blogTitle: draft.blogTitle,
        blogContent: draft.blogContent,
        blogExcerpt: draft.blogExcerpt,
        changeNote: 'Pre-review snapshot',
        createdAt: new Date(),
      })
      .run();

    const composedPrompt = composePrompt({
      operation: 'review',
      contentType,
      draftContent,
    });

    // Pre-flight token check
    const estimatedTokenCount = estimateTokens(composedPrompt);
    if (estimatedTokenCount > MAX_ESTIMATED_TOKENS) {
      // Reset status
      db.update(drafts)
        .set({ status: 'draft' as const, updatedAt: new Date() })
        .where(eq(drafts.id, draftId))
        .run();
      return createErrorResponse(
        'PROMPT_TOO_LARGE',
        `Estimated ${estimatedTokenCount} tokens exceeds limit.`,
        400,
      );
    }

    logger.info('writing', 'Anti-slop review started', { draftId, contentType });

    const report = await reviewContent(composedPrompt);

    // Update draft with review results
    db.update(drafts)
      .set({
        antiSlopScore: report.score,
        antiSlopReport: JSON.stringify(report),
        status: 'draft' as const,
        updatedAt: new Date(),
      })
      .where(eq(drafts.id, draftId))
      .run();

    logger.info('writing', 'Anti-slop review complete', {
      draftId,
      score: report.score,
      suggestions: report.suggestions.length,
    });

    return createSuccessResponse(report);
  } catch (err) {
    logger.error('writing', 'Failed to review content', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to review content', 500);
  }
}
