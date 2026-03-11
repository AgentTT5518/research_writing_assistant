import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftVersions } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { coWriteSchema } from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';
import { streamWriteContent } from '@/shared/lib/ai-client';
import { createSSEResponse } from '@/shared/lib/sse-utils';
import { buildResearchContextFromDraftLinks } from '@/features/writing/services/research-context';

const MAX_ESTIMATED_TOKENS = 180_000;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = coWriteSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  const { draftId, action, contentType, existingDraft, selection, topic, userInstructions } = parsed.data;

  // Verify draft exists
  const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
  if (!draft) {
    return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
  }

  // Gather research context from linked items
  const { researchNotesCompact: researchNotes } = buildResearchContextFromDraftLinks(draftId);

  const composedPrompt = composePrompt({
    operation: 'co_write',
    contentType,
    topic,
    researchNotes,
    existingDraft,
    coWriteAction: action,
    selection,
    userInstructions,
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

  // Create version snapshot before co-writing
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
      changeNote: `Pre-co-write: ${action}`,
      createdAt: new Date(),
    })
    .run();

  logger.info('writing', 'Co-write started', { draftId, action, contentType });

  return createSSEResponse(request, async (send) => {
    let accumulatedContent = '';

    await streamWriteContent(
      {
        composedPrompt,
        feature: 'writing',
        operation: `co_write:${contentType}`,
        signal: request.signal,
      },
      {
        onChunk: (content) => {
          accumulatedContent += content;
          send.chunk(content);
        },
        onDone: ({ tokensUsed }) => {
          // Update draft based on action
          let finalContent: string;
          if (action === 'continue') {
            const existing = contentType === 'linkedin' ? draft.linkedinContent ?? '' : draft.blogContent ?? '';
            finalContent = existing ? `${existing}\n\n${accumulatedContent}` : accumulatedContent;
          } else {
            // improve, suggest, transform — replace content
            finalContent = accumulatedContent;
          }

          const updateFields =
            contentType === 'linkedin'
              ? { linkedinContent: finalContent }
              : { blogContent: finalContent };

          db.update(drafts)
            .set({ ...updateFields, updatedAt: new Date() })
            .where(eq(drafts.id, draftId))
            .run();

          logger.info('writing', 'Co-write complete', { draftId, action, tokensUsed });
          send.done({ draftId, tokensUsed });
        },
        onError: (error) => {
          logger.error('writing', 'Co-write failed', new Error(error.message));
          send.error(error);
        },
      },
    );
  });
}
