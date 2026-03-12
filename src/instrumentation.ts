/**
 * Next.js instrumentation hook (Next.js 14+).
 * Starts the scheduler on app boot in Node.js runtime only.
 * See ADR-004 for scheduling architecture decision.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('@/shared/lib/scheduler');
    startScheduler();
  }
}
