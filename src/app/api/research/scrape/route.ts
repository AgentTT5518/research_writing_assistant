import { NextRequest } from 'next/server';
import { db } from '@/shared/lib/db';
import { researchItems } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { summarizeContent } from '@/shared/lib/ai-client';
import { urlScrapeSchema } from '@/features/research/types';

function stripHtml(html: string): string {
  // Remove script and style tags with content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : 'Untitled';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = urlScrapeSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { url, projectId } = parsed.data;

    logger.info('research', 'URL scrape started', { url, projectId });

    // Fetch the URL with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ResearchWritingAssistant/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return createErrorResponse(
          'BAD_REQUEST',
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
          400
        );
      }

      html = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return createErrorResponse('BAD_REQUEST', 'URL fetch timed out after 30 seconds', 408);
      }
      throw fetchErr;
    }
    const title = extractTitle(html);
    const textContent = stripHtml(html);

    if (textContent.length < 50) {
      return createErrorResponse(
        'BAD_REQUEST',
        'URL content too short to summarize',
        400
      );
    }

    // Truncate content to avoid excessive token usage (max ~50k chars)
    const truncatedContent = textContent.slice(0, 50000);

    // Summarize with Claude
    const summary = await summarizeContent(truncatedContent);

    // Save as research item
    const now = new Date();
    const item = {
      id: generateId(),
      projectId,
      sourceType: 'url' as const,
      title,
      url,
      content: truncatedContent.slice(0, 10000), // Store first 10k chars of content
      summary,
      authors: null,
      publishedDate: null,
      reliabilityTier: null,
      metadata: JSON.stringify({ scrapedAt: now.toISOString(), contentLength: textContent.length }),
      createdAt: now,
    };

    db.insert(researchItems).values(item).run();

    logger.info('research', 'URL scrape completed', {
      itemId: item.id,
      url,
      contentLength: textContent.length,
    });

    return createSuccessResponse(item, 201);
  } catch (err) {
    logger.error('research', 'URL scrape failed', err as Error);

    const message = err instanceof Error ? err.message : 'URL scrape failed';
    if (message.includes('ANTHROPIC_API_KEY')) {
      return createErrorResponse('BAD_REQUEST', 'Anthropic API key is not configured', 400);
    }

    return createErrorResponse('INTERNAL_ERROR', 'URL scrape failed', 500);
  }
}
