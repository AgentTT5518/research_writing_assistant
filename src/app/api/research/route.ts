import { NextRequest } from 'next/server';
import { desc, eq, and, like, or } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { researchItems, tags, researchItemTags } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { createResearchItemSchema } from '@/features/research/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const sourceType = searchParams.get('sourceType');
    const search = searchParams.get('search');

    const conditions = [];

    if (projectId) {
      conditions.push(eq(researchItems.projectId, projectId));
    }
    if (sourceType) {
      conditions.push(eq(researchItems.sourceType, sourceType as 'web' | 'url' | 'academic'));
    }
    if (search) {
      conditions.push(
        or(
          like(researchItems.title, `%${search}%`),
          like(researchItems.summary, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = db
      .select()
      .from(researchItems)
      .where(whereClause)
      .orderBy(desc(researchItems.createdAt))
      .all();

    // Attach tags to each item
    const itemsWithTags = items.map((item) => {
      const itemTags = db
        .select({ id: tags.id, name: tags.name })
        .from(researchItemTags)
        .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
        .where(eq(researchItemTags.researchItemId, item.id))
        .all();

      return { ...item, tags: itemTags };
    });

    return createSuccessResponse(itemsWithTags);
  } catch (err) {
    logger.error('research', 'Failed to list research items', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to list research items', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createResearchItemSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { tagNames, ...itemData } = parsed.data;
    const now = new Date();

    const item = {
      id: generateId(),
      ...itemData,
      createdAt: now,
    };

    db.insert(researchItems).values(item).run();

    // Handle tags
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        let existingTag = db
          .select()
          .from(tags)
          .where(eq(tags.name, tagName))
          .get();

        if (!existingTag) {
          const newTag = { id: generateId(), name: tagName };
          db.insert(tags).values(newTag).run();
          existingTag = newTag;
        }

        db.insert(researchItemTags)
          .values({
            researchItemId: item.id,
            tagId: existingTag.id,
          })
          .run();
      }
    }

    // Return item with tags
    const itemTags = db
      .select({ id: tags.id, name: tags.name })
      .from(researchItemTags)
      .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
      .where(eq(researchItemTags.researchItemId, item.id))
      .all();

    logger.info('research', 'Research item created', { itemId: item.id, sourceType: item.sourceType });
    return createSuccessResponse({ ...item, tags: itemTags }, 201);
  } catch (err) {
    logger.error('research', 'Failed to create research item', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to create research item', 500);
  }
}
