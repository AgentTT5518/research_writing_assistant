import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { drafts, schedules } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { publishBlogSchema } from '@/features/publishing/types';
import { publishBlogPost, uploadImageToStorage } from '@/shared/lib/firebase-admin';
import { sanitizeBlogContent } from '@/shared/lib/validate-content';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publishBlogSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.errors[0].message, 400);
    }

    const { draftId } = parsed.data;

    // Fetch and validate draft
    const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${draftId} not found`, 404);
    }

    if (draft.status !== 'approved' && draft.status !== 'scheduled') {
      return createErrorResponse(
        'INVALID_STATE',
        `Draft must be approved or scheduled to publish (current: ${draft.status})`,
        400
      );
    }

    if (!draft.blogTitle || !draft.blogContent) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Blog title and content are required for blog publishing',
        400
      );
    }

    logger.info('publishing:api', 'Blog publish started', { draftId });

    // Sanitize HTML content
    const sanitizedContent = sanitizeBlogContent(draft.blogContent);

    // Upload cover image if present
    let imageUrl: string | undefined;
    if (draft.coverImagePath && draft.coverImagePath.startsWith('data/')) {
      try {
        imageUrl = await uploadImageToStorage(draft.coverImagePath, draftId);
      } catch (err) {
        logger.error('publishing:api', 'Image upload failed, continuing without image', err as Error);
      }
    }

    // Publish to Firestore
    const { postId } = await publishBlogPost({
      title: draft.blogTitle,
      content: sanitizedContent,
      excerpt: draft.blogExcerpt ?? undefined,
      imageUrl,
    });

    // Construct URL
    const url = process.env.BLOG_BASE_URL
      ? `${process.env.BLOG_BASE_URL}/posts/${postId}`
      : postId;

    // Update draft status
    db.update(drafts)
      .set({
        status: 'published',
        ...(imageUrl && { coverImagePath: imageUrl }),
        updatedAt: new Date(),
      })
      .where(eq(drafts.id, draftId))
      .run();

    // Update related schedule if exists
    const relatedSchedule = db
      .select()
      .from(schedules)
      .where(eq(schedules.draftId, draftId))
      .get();

    if (relatedSchedule && relatedSchedule.status === 'pending') {
      db.update(schedules)
        .set({
          status: 'published',
          publishedUrl: url,
          publishedAt: new Date(),
        })
        .where(eq(schedules.id, relatedSchedule.id))
        .run();
    }

    logger.info('publishing:api', 'Blog published successfully', { draftId, postId, url });

    return createSuccessResponse({ postId, url }, 200);
  } catch (err) {
    logger.error('publishing:api', 'Blog publish failed', err as Error);
    return createErrorResponse('PUBLISH_FAILED', 'Failed to publish blog post', 500);
  }
}
