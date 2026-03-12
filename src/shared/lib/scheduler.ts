import cron, { type ScheduledTask } from 'node-cron';
import { eq, and, lte, lt, or } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { schedules, drafts } from '@/db/schema';
import { logger } from '@/shared/lib/logger';

// globalThis singleton for HMR safety (same pattern as db.ts)
const globalForScheduler = globalThis as unknown as {
  __scheduler: ScheduledTask | undefined;
  __schedulerMutex: boolean | undefined;
};

const STUCK_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PUBLISH_ATTEMPTS = 3;
const MIN_RETRY_GAP_MS = 5 * 60 * 1000; // 5 minutes between retries

interface TickResult {
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * Recover stuck jobs that have been in 'publishing' status for too long.
 * This handles cases where the server crashed mid-publish.
 */
function recoverStuckJobs(): number {
  const cutoff = new Date(Date.now() - STUCK_JOB_TIMEOUT_MS);

  const stuck = db
    .select({ id: schedules.id })
    .from(schedules)
    .where(
      and(
        eq(schedules.status, 'publishing'),
        lte(schedules.lastAttemptAt, cutoff)
      )
    )
    .all();

  if (stuck.length > 0) {
    for (const job of stuck) {
      db.update(schedules)
        .set({ status: 'pending' })
        .where(eq(schedules.id, job.id))
        .run();
    }
    logger.warn('publishing:scheduler', `Recovered ${stuck.length} stuck jobs`, {
      count: stuck.length,
    });
  }

  return stuck.length;
}

/**
 * Query for due jobs that should be processed.
 * Includes pending jobs and failed jobs eligible for retry.
 *
 * Timezone note: scheduledAt is stored as UTC integer timestamp (schema mode: 'timestamp').
 * Date.now() returns UTC ms. Comparison is always in UTC.
 */
function queryDueJobs() {
  const now = new Date();
  const retryCutoff = new Date(Date.now() - MIN_RETRY_GAP_MS);

  return db
    .select()
    .from(schedules)
    .where(
      and(
        lte(schedules.scheduledAt, now),
        or(
          eq(schedules.status, 'pending'),
          and(
            eq(schedules.status, 'failed'),
            lt(schedules.publishAttempts, MAX_PUBLISH_ATTEMPTS),
            lte(schedules.lastAttemptAt, retryCutoff)
          )
        )
      )
    )
    .all();
}

/**
 * Process a single schedule job by dispatching to the appropriate publish function.
 * Publish functions are imported lazily to avoid circular dependencies and to
 * allow Phase 4b/4c to be implemented independently.
 */
async function processJob(
  schedule: typeof schedules.$inferSelect
): Promise<{ success: boolean; url?: string; error?: string }> {
  const { platform, draftId } = schedule;

  if (!draftId) {
    return { success: false, error: 'Schedule has no associated draft' };
  }

  try {
    const draft = db.select().from(drafts).where(eq(drafts.id, draftId)).get();
    if (!draft) {
      return { success: false, error: `Draft ${draftId} not found` };
    }

    // Phase 4b/4c: These functions will be implemented in subsequent phases.
    // For now, we dispatch based on platform and call the publish modules.
    const results: Array<{ success: boolean; url?: string; error?: string }> = [];

    if (platform === 'blog' || platform === 'both') {
      try {
        const { publishBlogPost, uploadImageToStorage } = await import('@/shared/lib/firebase-admin');
        const { sanitizeBlogContent } = await import('@/shared/lib/validate-content');

        if (!draft.blogTitle || !draft.blogContent) {
          results.push({ success: false, error: 'Blog title and content are required' });
        } else {
          const sanitizedContent = sanitizeBlogContent(draft.blogContent);
          let imageUrl: string | undefined;

          if (draft.coverImagePath && draft.coverImagePath.startsWith('data/')) {
            imageUrl = await uploadImageToStorage(draft.coverImagePath, draftId);
          }

          const { postId } = await publishBlogPost({
            title: draft.blogTitle,
            content: sanitizedContent,
            excerpt: draft.blogExcerpt ?? undefined,
            imageUrl,
          });

          const blogUrl = process.env.BLOG_BASE_URL
            ? `${process.env.BLOG_BASE_URL}/posts/${postId}`
            : postId;

          results.push({ success: true, url: blogUrl });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Blog publish failed';
        results.push({ success: false, error: message });
      }
    }

    if (platform === 'linkedin' || platform === 'both') {
      try {
        const { publishLinkedInPost } = await import('@/shared/lib/linkedin-client');

        if (!draft.linkedinContent) {
          results.push({ success: false, error: 'LinkedIn content is required' });
        } else {
          const { postUrl } = await publishLinkedInPost(
            draft.linkedinContent,
            draft.coverImagePath && draft.coverImagePath.startsWith('data/')
              ? draft.coverImagePath
              : undefined
          );
          results.push({ success: true, url: postUrl });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'LinkedIn publish failed';
        results.push({ success: false, error: message });
      }
    }

    const allSucceeded = results.every((r) => r.success);
    const firstError = results.find((r) => !r.success)?.error;
    const firstUrl = results.find((r) => r.url)?.url;

    return {
      success: allSucceeded,
      url: firstUrl,
      error: firstError,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown publish error';
    return { success: false, error: message };
  }
}

/**
 * Main tick function — called every 60 seconds by node-cron.
 * Processes all due schedules with mutex protection.
 */
export async function tick(): Promise<TickResult> {
  // Mutex guard: skip if already running
  if (globalForScheduler.__schedulerMutex) {
    logger.debug('publishing:scheduler', 'Tick skipped — previous tick still running');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  globalForScheduler.__schedulerMutex = true;
  const result: TickResult = { processed: 0, succeeded: 0, failed: 0 };

  try {
    // Step 1: Recover stuck jobs
    recoverStuckJobs();

    // Step 2: Query due jobs
    const dueJobs = queryDueJobs();
    if (dueJobs.length === 0) {
      return result;
    }

    logger.info('publishing:scheduler', `Processing ${dueJobs.length} due jobs`);

    // Step 3: Process each job
    for (const job of dueJobs) {
      result.processed++;

      if (!job.draftId) {
        result.failed++;
        logger.warn('publishing:scheduler', 'Skipping job with no draftId', { scheduleId: job.id });
        continue;
      }

      const now = new Date();

      // Mark as publishing
      db.update(schedules)
        .set({
          status: 'publishing',
          publishAttempts: (job.publishAttempts ?? 0) + 1,
          lastAttemptAt: now,
        })
        .where(eq(schedules.id, job.id))
        .run();

      const publishResult = await processJob(job);

      if (publishResult.success) {
        // Success: mark published
        db.update(schedules)
          .set({
            status: 'published',
            publishedAt: new Date(),
            publishedUrl: publishResult.url ?? null,
            errorMessage: null,
          })
          .where(eq(schedules.id, job.id))
          .run();

        // Update draft status to published
        db.update(drafts)
          .set({ status: 'published', updatedAt: new Date() })
          .where(eq(drafts.id, job.draftId))
          .run();

        result.succeeded++;
        logger.info('publishing:scheduler', 'Job published successfully', {
          scheduleId: job.id,
          draftId: job.draftId,
          platform: job.platform,
          url: publishResult.url,
        });
      } else {
        // Failure: store error
        const attempts = (job.publishAttempts ?? 0) + 1;

        db.update(schedules)
          .set({
            status: 'failed',
            errorMessage: publishResult.error ?? 'Unknown error',
          })
          .where(eq(schedules.id, job.id))
          .run();

        // If max attempts reached, update draft status to failed
        if (attempts >= MAX_PUBLISH_ATTEMPTS) {
          db.update(drafts)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(drafts.id, job.draftId))
            .run();
        }

        result.failed++;
        logger.error('publishing:scheduler', 'Job failed', {
          error: new Error(publishResult.error ?? 'Unknown error'),
          context: {
            scheduleId: job.id,
            draftId: job.draftId,
            platform: job.platform,
            attempt: attempts,
            maxAttempts: MAX_PUBLISH_ATTEMPTS,
          },
        });
      }
    }

    logger.info('publishing:scheduler', 'Tick complete', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } finally {
    globalForScheduler.__schedulerMutex = false;
  }

  return result;
}

/**
 * Start the scheduler. Called from instrumentation.ts on app boot.
 * Uses globalThis singleton to survive HMR restarts in dev mode.
 */
export function startScheduler(): void {
  if (globalForScheduler.__scheduler) {
    logger.info('publishing:scheduler', 'Scheduler already running, skipping');
    return;
  }

  // Log pending job count on startup
  const pendingJobs = db
    .select({ id: schedules.id })
    .from(schedules)
    .where(eq(schedules.status, 'pending'))
    .all();

  logger.info('publishing:scheduler', 'Starting scheduler', {
    pendingJobs: pendingJobs.length,
  });

  // Run recovery immediately on startup (catch stuck jobs from previous crash)
  const recovered = recoverStuckJobs();
  if (recovered > 0) {
    logger.info('publishing:scheduler', 'Startup recovery complete', {
      recoveredJobs: recovered,
    });
  }

  // Schedule tick every 60 seconds
  globalForScheduler.__scheduler = cron.schedule('* * * * *', () => {
    tick().catch((err) => {
      logger.error('publishing:scheduler', 'Tick threw unhandled error', err as Error);
    });
  });
}

/**
 * Stop the scheduler. Used for testing and cleanup.
 */
export function stopScheduler(): void {
  if (globalForScheduler.__scheduler) {
    globalForScheduler.__scheduler.stop();
    globalForScheduler.__scheduler = undefined;
    logger.info('publishing:scheduler', 'Scheduler stopped');
  }
}
