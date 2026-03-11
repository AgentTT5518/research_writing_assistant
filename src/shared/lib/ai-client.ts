import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/shared/lib/db';
import { aiUsage } from '@/db/schema';
import { generateId } from '@/shared/lib/id';
import { logger } from '@/shared/lib/logger';
import type { ComposedPrompt, AntiSlopReport } from '@/features/writing/types';
import { parseAntiSlopReviewResponse } from '@/shared/lib/prompts/anti-slop-review';

interface SummarizeOptions {
  maxTokens?: number;
}

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (metadata: { tokensUsed: number }) => void;
  onError: (error: { code: string; message: string; partial: boolean }) => void;
}

export interface WriteOptions {
  composedPrompt: ComposedPrompt;
  feature: string;
  operation: string;
  signal?: AbortSignal;
}

const MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 1024;
const MAX_RETRIES = 3;

// Rough cost estimates per 1M tokens (Claude Sonnet)
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey });
}

export async function summarizeContent(
  content: string,
  options?: SummarizeOptions
): Promise<string> {
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const client = getClient();

  logger.info('research', 'AI summarization started', {
    contentLength: content.length,
    maxTokens,
  });

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: `Summarize the following content concisely, highlighting the key points, findings, and arguments. Keep the summary informative and well-structured.\n\n${content}`,
          },
        ],
      });

      const durationMs = Date.now() - startTime;
      const summary =
        response.content[0].type === 'text' ? response.content[0].text : '';

      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const estimatedCostUsd =
        (promptTokens / 1_000_000) * INPUT_COST_PER_MILLION +
        (completionTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

      // Track usage
      try {
        db.insert(aiUsage)
          .values({
            id: generateId(),
            feature: 'research',
            operation: 'summarize',
            model: MODEL,
            promptTokens,
            completionTokens,
            estimatedCostUsd,
            durationMs,
            createdAt: new Date(),
          })
          .run();
      } catch (trackErr) {
        logger.error('research', 'Failed to track AI usage', trackErr as Error);
      }

      logger.info('research', 'AI summarization complete', {
        durationMs,
        promptTokens,
        completionTokens,
      });

      return summary;
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn('research', `AI summarization attempt ${attempt + 1} failed, retrying`, {
          delay,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  logger.error('research', 'AI summarization failed after retries', lastError!);
  throw lastError!;
}

// ─── Streaming AI Content Generation ───

function trackUsage(
  feature: string,
  operation: string,
  promptTokens: number,
  completionTokens: number,
  durationMs: number,
): void {
  const estimatedCostUsd =
    (promptTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (completionTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  try {
    db.insert(aiUsage)
      .values({
        id: generateId(),
        feature,
        operation,
        model: MODEL,
        promptTokens,
        completionTokens,
        estimatedCostUsd,
        durationMs,
        createdAt: new Date(),
      })
      .run();
  } catch (trackErr) {
    logger.error(feature, 'Failed to track AI usage', trackErr as Error);
  }
}

/**
 * Stream AI-generated content using the Anthropic streaming API.
 * Does NOT retry mid-stream — if the stream fails, onError is called
 * and partial content should be preserved by the caller.
 */
export async function streamWriteContent(
  options: WriteOptions,
  callbacks: StreamCallbacks,
): Promise<void> {
  const { composedPrompt, feature, operation, signal } = options;
  const client = getClient();
  const startTime = Date.now();

  logger.info(feature, `Streaming ${operation} started`, {
    temperature: composedPrompt.temperature,
    maxTokens: composedPrompt.maxTokens,
  });

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: composedPrompt.maxTokens,
      temperature: composedPrompt.temperature,
      system: composedPrompt.system,
      messages: [{ role: 'user', content: composedPrompt.user }],
    });

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        stream.abort();
      }, { once: true });
    }

    for await (const event of stream) {
      if (signal?.aborted) {
        callbacks.onError({
          code: 'ABORTED',
          message: 'Request was cancelled',
          partial: true,
        });
        return;
      }

      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        callbacks.onChunk(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    const durationMs = Date.now() - startTime;
    const promptTokens = finalMessage.usage.input_tokens;
    const completionTokens = finalMessage.usage.output_tokens;

    trackUsage(feature, operation, promptTokens, completionTokens, durationMs);

    logger.info(feature, `Streaming ${operation} complete`, {
      durationMs,
      promptTokens,
      completionTokens,
    });

    callbacks.onDone({ tokensUsed: promptTokens + completionTokens });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error(feature, `Streaming ${operation} failed`, err as Error, {
      durationMs,
    });

    callbacks.onError({
      code: 'STREAM_ERROR',
      message: (err as Error).message,
      partial: true,
    });
  }
}

/**
 * Non-streaming AI content generation. Used for outlines, adaptation, etc.
 * Retries up to 3 times with exponential backoff.
 */
export async function generateContent(
  composedPrompt: ComposedPrompt,
  feature: string,
  operation: string,
): Promise<{ content: string; tokensUsed: number }> {
  const client = getClient();
  const startTime = Date.now();
  let lastError: Error | null = null;

  logger.info(feature, `Content generation started: ${operation}`, {
    temperature: composedPrompt.temperature,
    maxTokens: composedPrompt.maxTokens,
  });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: composedPrompt.maxTokens,
        temperature: composedPrompt.temperature,
        system: composedPrompt.system,
        messages: [{ role: 'user', content: composedPrompt.user }],
      });

      const durationMs = Date.now() - startTime;
      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';
      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;

      trackUsage(feature, operation, promptTokens, completionTokens, durationMs);

      logger.info(feature, `Content generation complete: ${operation}`, {
        durationMs,
        promptTokens,
        completionTokens,
      });

      return { content, tokensUsed: promptTokens + completionTokens };
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(feature, `${operation} attempt ${attempt + 1} failed, retrying`, {
          delay,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  logger.error(feature, `${operation} failed after retries`, lastError!);
  throw lastError!;
}

/**
 * Run anti-slop quality review on content.
 * Returns structured score + suggestions.
 */
export async function reviewContent(
  composedPrompt: ComposedPrompt,
): Promise<AntiSlopReport> {
  const { content } = await generateContent(composedPrompt, 'writing', 'review');
  return parseAntiSlopReviewResponse(content);
}
