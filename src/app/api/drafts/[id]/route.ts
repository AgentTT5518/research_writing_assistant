import { NextRequest } from 'next/server';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, draftVersions, draftResearchLinks } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { updateDraftSchema } from '@/features/writing/types';

const MAX_VERSIONS = 20;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const draft = db.select().from(drafts).where(eq(drafts.id, id)).get();

    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${id} not found`, 404);
    }

    // Attach versions (latest 20)
    const versions = db
      .select()
      .from(draftVersions)
      .where(eq(draftVersions.draftId, id))
      .orderBy(desc(draftVersions.versionNumber))
      .limit(MAX_VERSIONS)
      .all();

    // Attach linked research item IDs
    const researchLinks = db
      .select({ researchItemId: draftResearchLinks.researchItemId })
      .from(draftResearchLinks)
      .where(eq(draftResearchLinks.draftId, id))
      .all();
    const researchItemIds = researchLinks.map((r) => r.researchItemId);

    return createSuccessResponse({ ...draft, versions, researchItemIds });
  } catch (err) {
    logger.error('writing', 'Failed to get draft', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get draft', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const existing = db.select().from(drafts).where(eq(drafts.id, id)).get();

    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${id} not found`, 404);
    }

    const body = await request.json();
    const parsed = updateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { changeNote, ...updateFields } = parsed.data;
    const now = new Date();

    // Create version snapshot if changeNote is provided
    if (changeNote) {
      const existingVersions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, id))
        .orderBy(desc(draftVersions.versionNumber))
        .all();

      const nextVersionNumber = existingVersions.length > 0
        ? existingVersions[0].versionNumber + 1
        : 1;

      db.insert(draftVersions)
        .values({
          id: generateId(),
          draftId: id,
          versionNumber: nextVersionNumber,
          linkedinContent: existing.linkedinContent,
          blogTitle: existing.blogTitle,
          blogContent: existing.blogContent,
          blogExcerpt: existing.blogExcerpt,
          changeNote,
          createdAt: now,
        })
        .run();

      // Prune old versions if exceeding limit
      const allVersions = db
        .select()
        .from(draftVersions)
        .where(eq(draftVersions.draftId, id))
        .orderBy(asc(draftVersions.versionNumber))
        .all();

      if (allVersions.length > MAX_VERSIONS) {
        const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS);
        for (const v of toDelete) {
          db.delete(draftVersions).where(eq(draftVersions.id, v.id)).run();
        }
      }

      logger.info('writing', 'Draft version created', {
        draftId: id,
        versionNumber: nextVersionNumber,
        changeNote,
      });
    }

    // Apply updates
    db.update(drafts)
      .set({ ...updateFields, updatedAt: now })
      .where(eq(drafts.id, id))
      .run();

    const updated = db.select().from(drafts).where(eq(drafts.id, id)).get();
    return createSuccessResponse(updated);
  } catch (err) {
    logger.error('writing', 'Failed to update draft', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update draft', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const existing = db.select().from(drafts).where(eq(drafts.id, id)).get();

    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${id} not found`, 404);
    }

    // Cascading deletes via FK constraints, but explicit for safety
    db.delete(draftVersions).where(eq(draftVersions.draftId, id)).run();
    db.delete(draftResearchLinks).where(eq(draftResearchLinks.draftId, id)).run();
    db.delete(drafts).where(eq(drafts.id, id)).run();

    logger.info('writing', 'Draft deleted', { draftId: id });
    return createSuccessResponse({ ok: true });
  } catch (err) {
    logger.error('writing', 'Failed to delete draft', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to delete draft', 500);
  }
}
