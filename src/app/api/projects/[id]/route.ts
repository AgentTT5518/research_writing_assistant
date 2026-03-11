import { NextRequest } from 'next/server';
import { eq, count } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { projects, researchItems, drafts } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { updateProjectSchema } from '@/features/content-management/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Project ${id} not found`, 404);
    }

    const researchCount = db
      .select({ count: count() })
      .from(researchItems)
      .where(eq(researchItems.projectId, id))
      .get();

    const draftCount = db
      .select({ count: count() })
      .from(drafts)
      .where(eq(drafts.projectId, id))
      .get();

    return createSuccessResponse({
      ...project,
      researchItemCount: researchCount?.count ?? 0,
      draftCount: draftCount?.count ?? 0,
    });
  } catch (err) {
    logger.error('content-management', 'Failed to get project', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get project', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const existing = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Project ${id} not found`, 404);
    }

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const updates = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    db.update(projects).set(updates).where(eq(projects.id, id)).run();
    const updated = db.select().from(projects).where(eq(projects.id, id)).get();
    logger.info('content-management', 'Project updated', { projectId: id });
    return createSuccessResponse(updated);
  } catch (err) {
    logger.error('content-management', 'Failed to update project', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update project', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const existing = db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Project ${id} not found`, 404);
    }

    db.delete(projects).where(eq(projects.id, id)).run();
    logger.info('content-management', 'Project deleted', { projectId: id });
    return createSuccessResponse({ ok: true });
  } catch (err) {
    logger.error('content-management', 'Failed to delete project', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to delete project', 500);
  }
}
