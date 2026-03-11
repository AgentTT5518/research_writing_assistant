import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftVersions } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { expandOutlineSchema } from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';
import { streamWriteContent } from '@/shared/lib/ai-client';
import { createSSEResponse } from '@/shared/lib/sse-utils';

const MAX_ESTIMATED_TOKENS = 180_000;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = expandOutlineSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  const { draftId, sectionId, outline, userInstructions } = parsed.data;

  // Verify draft exists
  const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
  if (!draft) {
    return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
  }

  // Determine content type from existing draft content
  const contentType = draft.linkedinContent ? 'linkedin' : 'blog';

  // Compose prompt with section context
  const composedPrompt = composePrompt({
    operation: 'co_write',
    contentType,
    topic: `Expand section: ${sectionId}`,
    existingDraft: outline,
    coWriteAction: 'continue',
    userInstructions: userInstructions
      ? `Focus on expanding section "${sectionId}". ${userInstructions}`
      : `Focus on expanding section "${sectionId}" from the outline. Write detailed, engaging content for this section.`,
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

  // Create version snapshot before expanding
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
      changeNote: `Pre-expand: section ${sectionId}`,
      createdAt: new Date(),
    })
    .run();

  logger.info('writing', 'Outline expansion started', { draftId, sectionId });

  return createSSEResponse(request, async (send) => {
    let accumulatedContent = '';

    await streamWriteContent(
      {
        composedPrompt,
        feature: 'writing',
        operation: `expand:${contentType}`,
        signal: request.signal,
      },
      {
        onChunk: (content) => {
          accumulatedContent += content;
          send.chunk(content);
        },
        onDone: ({ tokensUsed }) => {
          // Append expanded content to draft
          const existingContent =
            contentType === 'linkedin' ? draft.linkedinContent ?? '' : draft.blogContent ?? '';
          const updatedContent = existingContent
            ? `${existingContent}\n\n${accumulatedContent}`
            : accumulatedContent;

          const updateFields =
            contentType === 'linkedin'
              ? { linkedinContent: updatedContent }
              : { blogContent: updatedContent };

          db.update(drafts)
            .set({ ...updateFields, updatedAt: new Date() })
            .where(eq(drafts.id, draftId))
            .run();

          logger.info('writing', 'Outline expansion complete', { draftId, sectionId, tokensUsed });
          send.done({ draftId, tokensUsed });
        },
        onError: (error) => {
          logger.error('writing', 'Outline expansion failed', new Error(error.message));
          send.error(error);
        },
      },
    );
  });
}
