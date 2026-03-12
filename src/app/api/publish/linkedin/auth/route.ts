import { NextResponse } from 'next/server';
import { logger } from '@/shared/lib/logger';
import { getLinkedInAuthUrl } from '@/shared/lib/linkedin-client';

export async function GET() {
  try {
    const authUrl = getLinkedInAuthUrl();
    logger.info('publishing:linkedin', 'Redirecting to LinkedIn OAuth');
    return NextResponse.redirect(authUrl);
  } catch (err) {
    logger.error('publishing:linkedin', 'Failed to generate LinkedIn auth URL', err as Error);
    return NextResponse.redirect(
      new URL('/settings?linkedin=error&message=config_missing', process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/settings')
    );
  }
}
