import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { researchItems } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateOutlineSchema } from '@/features/writing/types';
import type { Outline, OutlineSection } from '@/features/writing/types';
import { composePrompt, estimateTokens } from '@/shared/lib/prompts/compose';
import { generateContent } from '@/shared/lib/ai-client';
import { buildResearchContext } from '@/features/writing/services/research-context';

const MAX_ESTIMATED_TOKENS = 180_000;

function parseOutlineResponse(content: string): Outline {
  // Try to extract JSON from code fence
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : content.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      thesis: String(parsed.thesis ?? ''),
      sections: Array.isArray(parsed.sections)
        ? parsed.sections.map((s: Record<string, unknown>, i: number): OutlineSection => ({
            id: String(s.id ?? `section-${i + 1}`),
            heading: String(s.heading ?? ''),
            points: Array.isArray(s.points) ? s.points.map(String) : [],
            sources: Array.isArray(s.sources) ? s.sources.map(String) : [],
            openingLine: String(s.openingLine ?? s.opening_line ?? ''),
            data: s.data ? String(s.data) : undefined,
          }))
        : [],
      researchGaps: Array.isArray(parsed.researchGaps ?? parsed.research_gaps)
        ? (parsed.researchGaps ?? parsed.research_gaps).map(String)
        : [],
    };
  } catch {
    // Return a minimal outline if parsing fails
    return {
      thesis: '',
      sections: [{ id: 'section-1', heading: 'Content', points: [content], sources: [], openingLine: '' }],
      researchGaps: [],
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateOutlineSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { researchItemIds, contentType, topic } = parsed.data;

    // Validate research items exist
    for (const rid of researchItemIds) {
      const item = db.select().from(researchItems).where(eq(researchItems.id, rid)).get();
      if (!item) {
        return createErrorResponse('VALIDATION_ERROR', `Research item ${rid} not found`, 400);
      }
    }

    // Gather research context (compact notes — no URLs for outline)
    const { researchNotesCompact: researchNotes, dataPoints } = buildResearchContext(researchItemIds);

    const composedPrompt = composePrompt({
      operation: 'outline',
      contentType,
      topic,
      researchNotes,
      dataPoints,
    });

    // Pre-flight token check
    const estimatedTokenCount = estimateTokens(composedPrompt);
    if (estimatedTokenCount > MAX_ESTIMATED_TOKENS) {
      return createErrorResponse(
        'PROMPT_TOO_LARGE',
        `Estimated ${estimatedTokenCount} tokens exceeds limit. Reduce research items.`,
        400,
      );
    }

    logger.info('writing', 'Outline generation started', { contentType, topic });

    const { content, tokensUsed } = await generateContent(composedPrompt, 'writing', `outline:${contentType}`);
    const outline = parseOutlineResponse(content);

    logger.info('writing', 'Outline generation complete', {
      sections: outline.sections.length,
      tokensUsed,
    });

    return createSuccessResponse(outline);
  } catch (err) {
    logger.error('writing', 'Failed to generate outline', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to generate outline', 500);
  }
}
