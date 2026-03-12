import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { schedules, drafts } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { createScheduleSchema } from '@/features/publishing/types';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const platform = url.searchParams.get('platform');
    const draftId = url.searchParams.get('draftId');

    const conditions = [];
    if (status) {
      conditions.push(eq(schedules.status, status as 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled'));
    }
    if (platform) {
      conditions.push(eq(schedules.platform, platform as 'linkedin' | 'blog' | 'both'));
    }
    if (draftId) {
      conditions.push(eq(schedules.draftId, draftId));
    }

    const query = db
      .select({
        schedule: schedules,
        draft: {
          id: drafts.id,
          blogTitle: drafts.blogTitle,
          linkedinContent: drafts.linkedinContent,
          status: drafts.status,
          projectId: drafts.projectId,
        },
      })
      .from(schedules)
      .leftJoin(drafts, eq(schedules.draftId, drafts.id))
      .orderBy(desc(schedules.scheduledAt));

    const rows = conditions.length > 0
      ? query.where(and(...conditions)).all()
      : query.all();

    const result = rows.map((row) => ({
      ...row.schedule,
      draft: row.draft,
    }));

    return createSuccessResponse(result);
  } catch (err) {
    logger.error('publishing:api', 'Failed to list schedules', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to list schedules', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { draftId, platform, scheduledAt } = parsed.data;

    // Verify draft exists and is approved/scheduled
    const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
    }
    if (draft.status !== 'approved' && draft.status !== 'scheduled') {
      return createErrorResponse(
        'DRAFT_NOT_APPROVED',
        `Draft must be approved or scheduled to create a schedule. Current status: ${draft.status}`,
        400
      );
    }

    const now = new Date();
    const schedule = {
      id: generateId(),
      draftId,
      platform,
      scheduledAt: new Date(scheduledAt),
      status: 'pending' as const,
      publishAttempts: 0,
      createdAt: now,
    };

    db.insert(schedules).values(schedule).run();

    // Update draft status to 'scheduled'
    db.update(drafts)
      .set({ status: 'scheduled', updatedAt: now })
      .where(eq(drafts.id, draftId))
      .run();

    logger.info('publishing:api', 'Schedule created', {
      scheduleId: schedule.id,
      draftId,
      platform,
      scheduledAt,
    });

    return createSuccessResponse(schedule, 201);
  } catch (err) {
    logger.error('publishing:api', 'Failed to create schedule', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to create schedule', 500);
  }
}
