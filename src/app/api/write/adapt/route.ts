import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftVersions } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { adaptContentSchema } from '@/features/writing/types';
import type { AdaptDirection } from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';
import { generateContent } from '@/shared/lib/ai-client';

const MAX_ESTIMATED_TOKENS = 180_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adaptContentSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { draftId, from, to, targetWordCount } = parsed.data;

    // Verify draft exists
    const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
    }

    // Get source content
    const sourceContent = from === 'linkedin' ? draft.linkedinContent : draft.blogContent;
    if (!sourceContent) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `Draft has no ${from} content to adapt`,
        400,
      );
    }

    const adaptDirection: AdaptDirection = `${from}_to_${to}` as AdaptDirection;

    const composedPrompt = composePrompt({
      operation: 'adapt',
      contentType: to,
      adaptDirection,
      originalContent: sourceContent,
      targetWordCount,
    });

    // Pre-flight token check
    const estimatedTokenCount = estimateTokens(composedPrompt);
    if (estimatedTokenCount > MAX_ESTIMATED_TOKENS) {
      return createErrorResponse(
        'PROMPT_TOO_LARGE',
        `Estimated ${estimatedTokenCount} tokens exceeds limit.`,
        400,
      );
    }

    // Create version snapshot before adaptation
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
        changeNote: `Pre-adapt: ${from} → ${to}`,
        createdAt: new Date(),
      })
      .run();

    logger.info('writing', 'Content adaptation started', { draftId, from, to });

    const { content: adaptedContent, tokensUsed } = await generateContent(
      composedPrompt,
      'writing',
      `adapt:${to}`,
    );

    // Update target field on draft
    const updateFields =
      to === 'linkedin'
        ? { linkedinContent: adaptedContent }
        : { blogContent: adaptedContent };

    db.update(drafts)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(drafts.id, draftId))
      .run();

    const updatedDraft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();

    logger.info('writing', 'Content adaptation complete', { draftId, from, to, tokensUsed });

    return createSuccessResponse(updatedDraft);
  } catch (err) {
    logger.error('writing', 'Failed to adapt content', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to adapt content', 500);
  }
}
