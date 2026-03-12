import { db } from '@/shared/lib/db';
import { aiUsage } from '@/db/schema';
import { createSuccessResponse, createErrorResponse } from '@/shared/lib/api-utils';
import { logger } from '@/shared/lib/logger';
import { sql } from 'drizzle-orm';

export interface AiUsageAggregation {
  feature: string;
  month: string; // YYYY-MM
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
}

export async function GET() {
  try {
    // Aggregate by feature + month
    const rows = db
      .select({
        feature: aiUsage.feature,
        // SQLite: extract YYYY-MM from unix timestamp
        month: sql<string>`strftime('%Y-%m', ${aiUsage.createdAt}, 'unixepoch')`.as('month'),
        totalRequests: sql<number>`count(*)`.as('total_requests'),
        totalPromptTokens: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)`.as('total_prompt_tokens'),
        totalCompletionTokens: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)`.as('total_completion_tokens'),
        totalCostUsd: sql<number>`coalesce(sum(${aiUsage.estimatedCostUsd}), 0)`.as('total_cost_usd'),
      })
      .from(aiUsage)
      .groupBy(aiUsage.feature, sql`strftime('%Y-%m', ${aiUsage.createdAt}, 'unixepoch')`)
      .orderBy(sql`month DESC`, aiUsage.feature)
      .all();

    // Also compute grand totals
    const totals = db
      .select({
        totalRequests: sql<number>`count(*)`.as('total_requests'),
        totalPromptTokens: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)`.as('total_prompt_tokens'),
        totalCompletionTokens: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)`.as('total_completion_tokens'),
        totalCostUsd: sql<number>`coalesce(sum(${aiUsage.estimatedCostUsd}), 0)`.as('total_cost_usd'),
      })
      .from(aiUsage)
      .get();

    return createSuccessResponse({
      usage: rows,
      totals: totals ?? {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCostUsd: 0,
      },
    });
  } catch (error) {
    logger.error('publishing:api', 'Failed to fetch AI usage', error as Error);
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch AI usage data', 500);
  }
}
