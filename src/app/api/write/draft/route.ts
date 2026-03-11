import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftResearchLinks, draftVersions, researchItems } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { generateDraftSchema } from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';
import { streamWriteContent } from '@/shared/lib/ai-client';
import { createSSEResponse } from '@/shared/lib/sse-utils';
import { buildResearchContext } from '@/features/writing/services/research-context';

const MAX_ESTIMATED_TOKENS = 180_000;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = generateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  const {
    projectId,
    researchItemIds,
    contentType,
    writingMode,
    topic,
    linkedInPostType,
    targetWordCount,
    userInstructions,
    authorContext,
  } = parsed.data;

  // Validate research items exist
  for (const rid of researchItemIds) {
    const item = db.select().from(researchItems).where(eq(researchItems.id, rid)).get();
    if (!item) {
      return createErrorResponse('VALIDATION_ERROR', `Research item ${rid} not found`, 400);
    }
  }

  // Gather research context
  const { researchNotes, dataPoints, sources } = buildResearchContext(researchItemIds);

  // Compose prompt
  const composedPrompt = composePrompt({
    operation: 'draft',
    contentType,
    topic,
    researchNotes,
    dataPoints,
    sources,
    authorContext,
    linkedInPostType,
    targetWordCount,
    userInstructions,
  });

  // Pre-flight token check
  const estimatedTokenCount = estimateTokens(composedPrompt);
  if (estimatedTokenCount > MAX_ESTIMATED_TOKENS) {
    return createErrorResponse(
      'PROMPT_TOO_LARGE',
      `Estimated ${estimatedTokenCount} tokens exceeds ${MAX_ESTIMATED_TOKENS} limit. Reduce research items or instructions.`,
      400,
    );
  }

  // Create draft record
  const draftId = generateId();
  const now = new Date();

  db.insert(drafts)
    .values({
      id: draftId,
      projectId,
      writingMode,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Link research items
  for (const researchItemId of researchItemIds) {
    db.insert(draftResearchLinks)
      .values({ draftId, researchItemId })
      .run();
  }

  logger.info('writing', 'Draft generation started', { draftId, contentType, writingMode, topic });

  return createSSEResponse(request, async (send) => {
    let accumulatedContent = '';

    await streamWriteContent(
      {
        composedPrompt,
        feature: 'writing',
        operation: `draft:${contentType}`,
        signal: request.signal,
      },
      {
        onChunk: (content) => {
          accumulatedContent += content;
          send.chunk(content);
        },
        onDone: ({ tokensUsed }) => {
          // Save content to draft
          const updateFields =
            contentType === 'linkedin'
              ? { linkedinContent: accumulatedContent }
              : { blogContent: accumulatedContent };

          db.update(drafts)
            .set({ ...updateFields, status: 'draft' as const, updatedAt: new Date() })
            .where(eq(drafts.id, draftId))
            .run();

          // Create initial version
          db.insert(draftVersions)
            .values({
              id: generateId(),
              draftId,
              versionNumber: 0,
              linkedinContent: contentType === 'linkedin' ? accumulatedContent : null,
              blogContent: contentType === 'blog' ? accumulatedContent : null,
              changeNote: 'Initial AI generation',
              createdAt: new Date(),
            })
            .run();

          logger.info('writing', 'Draft generation complete', { draftId, tokensUsed });
          send.done({ draftId, tokensUsed });
        },
        onError: (error) => {
          // Save partial content if any
          if (accumulatedContent.length > 0) {
            const updateFields =
              contentType === 'linkedin'
                ? { linkedinContent: accumulatedContent }
                : { blogContent: accumulatedContent };

            db.update(drafts)
              .set({ ...updateFields, status: 'failed' as const, updatedAt: new Date() })
              .where(eq(drafts.id, draftId))
              .run();
          } else {
            db.update(drafts)
              .set({ status: 'failed' as const, updatedAt: new Date() })
              .where(eq(drafts.id, draftId))
              .run();
          }

          logger.error('writing', 'Draft generation failed', new Error(error.message));
          send.error(error);
        },
      },
    );
  });
}
