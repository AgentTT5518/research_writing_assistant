import { NextRequest } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { schedules, drafts } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { updateScheduleSchema } from '@/features/publishing/types';

/**
 * If no other pending schedules exist for a draft, revert its status to 'approved'.
 */
function revertDraftIfNoOtherPending(draftId: string, excludeScheduleId: string): void {
  const otherPending = db
    .select({ id: schedules.id })
    .from(schedules)
    .where(
      and(
        eq(schedules.draftId, draftId),
        ne(schedules.id, excludeScheduleId),
        eq(schedules.status, 'pending')
      )
    )
    .get();

  if (!otherPending) {
    db.update(drafts)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(drafts.id, draftId))
      .run();
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const row = db
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
      .where(eq(schedules.id, id))
      .get();

    if (!row) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Schedule ${id} not found`, 404);
    }

    return createSuccessResponse({ ...row.schedule, draft: row.draft });
  } catch (err) {
    logger.error('publishing:api', 'Failed to get schedule', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get schedule', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = db.select().from(schedules).where(eq(schedules.id, id)).get();
    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Schedule ${id} not found`, 404);
    }

    // Only allow updating pending schedules
    if (existing.status !== 'pending') {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `Cannot update schedule with status '${existing.status}'. Only pending schedules can be updated.`,
        400
      );
    }

    const body = await request.json();
    const parsed = updateScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.scheduledAt) {
      updates.scheduledAt = new Date(parsed.data.scheduledAt);
    }

    if (parsed.data.status === 'cancelled') {
      updates.status = 'cancelled';
    }

    db.update(schedules).set(updates).where(eq(schedules.id, id)).run();

    // If cancelling, check if draft should revert to approved
    if (parsed.data.status === 'cancelled' && existing.draftId) {
      revertDraftIfNoOtherPending(existing.draftId, id);
      logger.info('publishing:api', 'Schedule cancelled', { scheduleId: id, draftId: existing.draftId });
    } else {
      logger.info('publishing:api', 'Schedule updated', { scheduleId: id });
    }

    const updated = db.select().from(schedules).where(eq(schedules.id, id)).get();
    return createSuccessResponse(updated);
  } catch (err) {
    logger.error('publishing:api', 'Failed to update schedule', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update schedule', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = db.select().from(schedules).where(eq(schedules.id, id)).get();
    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Schedule ${id} not found`, 404);
    }

    if (existing.status !== 'pending') {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `Cannot cancel schedule with status '${existing.status}'. Only pending schedules can be cancelled.`,
        400
      );
    }

    // Soft-cancel: set status to 'cancelled' instead of deleting
    db.update(schedules)
      .set({ status: 'cancelled' })
      .where(eq(schedules.id, id))
      .run();

    if (existing.draftId) {
      revertDraftIfNoOtherPending(existing.draftId, id);
    }

    logger.info('publishing:api', 'Schedule cancelled via DELETE', { scheduleId: id, draftId: existing.draftId });
    return createSuccessResponse({ ok: true });
  } catch (err) {
    logger.error('publishing:api', 'Failed to cancel schedule', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to cancel schedule', 500);
  }
}
