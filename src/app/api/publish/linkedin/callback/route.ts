import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/lib/logger';
import { exchangeCodeForToken } from '@/shared/lib/linkedin-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth error (e.g. user denied permission)
  if (error) {
    logger.warn('publishing:linkedin', 'OAuth callback received error', {
      error,
      errorDescription,
    });

    const message = error === 'user_cancelled_authorize' ? 'denied' : error;
    return NextResponse.redirect(
      new URL(`/settings?linkedin=${message}`, request.url)
    );
  }

  if (!code) {
    logger.warn('publishing:linkedin', 'OAuth callback missing code parameter');
    return NextResponse.redirect(
      new URL('/settings?linkedin=error&message=missing_code', request.url)
    );
  }

  try {
    await exchangeCodeForToken(code);

    logger.info('publishing:linkedin', 'OAuth flow completed successfully');
    return NextResponse.redirect(
      new URL('/settings?linkedin=connected', request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'token_exchange_failed';
    logger.error('publishing:linkedin', 'OAuth token exchange failed', err as Error);

    return NextResponse.redirect(
      new URL(`/settings?linkedin=error&message=token_exchange_failed`, request.url)
    );
  }
}
