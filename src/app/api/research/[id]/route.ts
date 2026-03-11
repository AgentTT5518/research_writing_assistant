import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { researchItems, tags, researchItemTags } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { updateResearchItemSchema } from '@/features/research/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const item = db.select().from(researchItems).where(eq(researchItems.id, id)).get();

    if (!item) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Research item ${id} not found`, 404);
    }

    const itemTags = db
      .select({ id: tags.id, name: tags.name })
      .from(researchItemTags)
      .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
      .where(eq(researchItemTags.researchItemId, id))
      .all();

    return createSuccessResponse({ ...item, tags: itemTags });
  } catch (err) {
    logger.error('research', 'Failed to get research item', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get research item', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const existing = db.select().from(researchItems).where(eq(researchItems.id, id)).get();

    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Research item ${id} not found`, 404);
    }

    const body = await request.json();
    const parsed = updateResearchItemSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { tagNames, ...updateFields } = parsed.data;

    // Update item fields if any provided
    if (Object.keys(updateFields).length > 0) {
      db.update(researchItems).set(updateFields).where(eq(researchItems.id, id)).run();
    }

    // Update tags if provided
    if (tagNames !== undefined) {
      // Remove existing tag links
      db.delete(researchItemTags).where(eq(researchItemTags.researchItemId, id)).run();

      // Add new tag links
      for (const tagName of tagNames) {
        let existingTag = db.select().from(tags).where(eq(tags.name, tagName)).get();

        if (!existingTag) {
          const newTag = { id: generateId(), name: tagName };
          db.insert(tags).values(newTag).run();
          existingTag = newTag;
        }

        db.insert(researchItemTags)
          .values({ researchItemId: id, tagId: existingTag.id })
          .run();
      }
    }

    const updated = db.select().from(researchItems).where(eq(researchItems.id, id)).get();
    const updatedTags = db
      .select({ id: tags.id, name: tags.name })
      .from(researchItemTags)
      .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
      .where(eq(researchItemTags.researchItemId, id))
      .all();

    logger.info('research', 'Research item updated', { itemId: id });
    return createSuccessResponse({ ...updated, tags: updatedTags });
  } catch (err) {
    logger.error('research', 'Failed to update research item', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update research item', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const existing = db
      .select({ id: researchItems.id })
      .from(researchItems)
      .where(eq(researchItems.id, id))
      .get();

    if (!existing) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Research item ${id} not found`, 404);
    }

    db.delete(researchItems).where(eq(researchItems.id, id)).run();
    logger.info('research', 'Research item deleted', { itemId: id });
    return createSuccessResponse({ ok: true });
  } catch (err) {
    logger.error('research', 'Failed to delete research item', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to delete research item', 500);
  }
}
