import { NextRequest } from 'next/server';
import { db } from '@/shared/lib/db';
import { appConfig } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { configUpdateSchema } from '@/features/publishing/types';
import type { ConfigResponse, EnvVarStatus } from '@/features/publishing/types';
import { eq } from 'drizzle-orm';

function getEnvVarStatus(): EnvVarStatus {
  return {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    firebase: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    linkedinClient: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
  };
}

function isLinkedInConnected(): boolean {
  try {
    const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
    if (!row) return false;
    const tokens = JSON.parse(row.value);
    return !!(tokens.accessToken && tokens.expiresAt > Date.now());
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const rows = db.select().from(appConfig).all();

    const config: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }

    const response: ConfigResponse = {
      config,
      envStatus: getEnvVarStatus(),
      linkedinConnected: isLinkedInConnected(),
      schedulerRunning: !!(globalThis as Record<string, unknown>).__scheduler,
    };

    return createSuccessResponse(response);
  } catch (err) {
    logger.error('publishing:api', 'Failed to get config', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get config', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = configUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { key, value } = parsed.data;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const now = new Date();

    db.insert(appConfig)
      .values({ key, value: serialized, updatedAt: now })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: { value: serialized, updatedAt: now },
      })
      .run();

    logger.info('publishing:api', 'Config updated', { key });
    return createSuccessResponse({ key, value, updatedAt: now.toISOString() });
  } catch (err) {
    logger.error('publishing:api', 'Failed to update config', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update config', 500);
  }
}
