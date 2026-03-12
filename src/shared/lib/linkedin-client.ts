/**
 * LinkedIn API client — OAuth 2.0 flow, token management, post creation.
 * Client ID + Secret from .env.local; OAuth tokens stored in appConfig DB.
 */
import { readFile } from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { appConfig } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import type { LinkedInTokens } from '@/features/publishing/types';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
const LINKEDIN_TOKENS_KEY = 'linkedin_tokens';

/**
 * Helper to retry an async operation with backoff.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw err;
      }
      const delay = RETRY_DELAY_MS * (attempt + 1);
      logger.warn('publishing:linkedin', `${label} failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`${label}: max retries exceeded`);
}

/**
 * Build the LinkedIn OAuth authorization URL.
 * Scopes: openid, profile, w_member_social
 */
export function getLinkedInAuthUrl(): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId) {
    throw new Error('LINKEDIN_CLIENT_ID is not configured');
  }
  if (!redirectUri) {
    throw new Error('LINKEDIN_REDIRECT_URI is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile w_member_social',
    state: crypto.randomUUID(),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForToken(code: string): Promise<LinkedInTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('LinkedIn OAuth credentials are not fully configured');
  }

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LinkedIn token exchange failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Fetch user profile to get LinkedIn URN
  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`LinkedIn profile fetch failed (${profileResponse.status})`);
  }

  const profile = (await profileResponse.json()) as { sub: string };

  const tokens: LinkedInTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
    linkedinUrn: profile.sub,
  };

  saveLinkedInTokens(tokens);

  logger.info('publishing:linkedin', 'OAuth tokens exchanged and saved', {
    linkedinUrn: tokens.linkedinUrn,
    expiresAt: new Date(tokens.expiresAt).toISOString(),
  });

  return tokens;
}

/**
 * Refresh an expired LinkedIn access token.
 */
export async function refreshLinkedInToken(refreshToken: string): Promise<LinkedInTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials are not fully configured');
  }

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    clearLinkedInTokens();
    throw new Error(`LINKEDIN_TOKEN_EXPIRED: Refresh failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const currentTokens = getLinkedInTokens();

  const tokens: LinkedInTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    linkedinUrn: currentTokens?.linkedinUrn ?? '',
  };

  saveLinkedInTokens(tokens);

  logger.info('publishing:linkedin', 'Access token refreshed', {
    expiresAt: new Date(tokens.expiresAt).toISOString(),
  });

  return tokens;
}

/**
 * Read LinkedIn tokens from appConfig DB.
 */
export function getLinkedInTokens(): LinkedInTokens | null {
  try {
    const row = db
      .select()
      .from(appConfig)
      .where(eq(appConfig.key, LINKEDIN_TOKENS_KEY))
      .get();

    if (!row) return null;
    return JSON.parse(row.value) as LinkedInTokens;
  } catch {
    return null;
  }
}

/**
 * Save LinkedIn tokens to appConfig DB.
 */
export function saveLinkedInTokens(tokens: LinkedInTokens): void {
  const now = new Date();
  const value = JSON.stringify(tokens);

  const existing = db
    .select()
    .from(appConfig)
    .where(eq(appConfig.key, LINKEDIN_TOKENS_KEY))
    .get();

  if (existing) {
    db.update(appConfig)
      .set({ value, updatedAt: now })
      .where(eq(appConfig.key, LINKEDIN_TOKENS_KEY))
      .run();
  } else {
    db.insert(appConfig)
      .values({ key: LINKEDIN_TOKENS_KEY, value, updatedAt: now })
      .run();
  }
}

/**
 * Delete LinkedIn tokens from appConfig DB.
 */
export function clearLinkedInTokens(): void {
  db.delete(appConfig)
    .where(eq(appConfig.key, LINKEDIN_TOKENS_KEY))
    .run();

  logger.info('publishing:linkedin', 'LinkedIn tokens cleared');
}

/**
 * Get a valid access token, auto-refreshing if near expiry.
 */
async function getValidAccessToken(): Promise<{ accessToken: string; linkedinUrn: string }> {
  const tokens = getLinkedInTokens();
  if (!tokens) {
    throw new Error('LINKEDIN_NOT_CONNECTED');
  }

  // Refresh if within 5 minutes of expiry
  if (tokens.expiresAt < Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    if (!tokens.refreshToken) {
      clearLinkedInTokens();
      throw new Error('LINKEDIN_TOKEN_EXPIRED');
    }

    const refreshed = await refreshLinkedInToken(tokens.refreshToken);
    return { accessToken: refreshed.accessToken, linkedinUrn: refreshed.linkedinUrn };
  }

  return { accessToken: tokens.accessToken, linkedinUrn: tokens.linkedinUrn };
}

/**
 * Upload an image to LinkedIn via the Assets API.
 * Returns the asset URN for inclusion in the post body.
 */
async function uploadLinkedInImage(
  localPath: string,
  accessToken: string,
  ownerUrn: string
): Promise<string> {
  const fullPath = path.join(process.cwd(), localPath);
  const fileBuffer = await readFile(fullPath);

  // Step 1: Register upload
  const registerResponse = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${ownerUrn}`,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }),
    }
  );

  if (!registerResponse.ok) {
    const body = await registerResponse.text();
    throw new Error(`LinkedIn image register failed (${registerResponse.status}): ${body}`);
  }

  const registerData = (await registerResponse.json()) as {
    value: {
      uploadMechanism: {
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
          uploadUrl: string;
        };
      };
      asset: string;
    };
  };

  const uploadUrl =
    registerData.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Step 2: Upload binary
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const body = await uploadResponse.text();
    throw new Error(`LinkedIn image upload failed (${uploadResponse.status}): ${body}`);
  }

  logger.info('publishing:linkedin', 'Image uploaded to LinkedIn', {
    assetUrn,
    size: fileBuffer.length,
  });

  return assetUrn;
}

/**
 * Publish a text (+ optional image) post to LinkedIn.
 * On 401: attempts one token refresh and retry.
 */
export async function publishLinkedInPost(
  content: string,
  imagePath?: string
): Promise<{ postUrl: string }> {
  const { accessToken, linkedinUrn } = await getValidAccessToken();

  const doPublish = async (token: string): Promise<{ postUrl: string }> => {
    let mediaAsset: string | undefined;

    if (imagePath) {
      mediaAsset = await withRetry(
        () => uploadLinkedInImage(imagePath, token, linkedinUrn),
        'LinkedIn image upload'
      );
    }

    const postBody: Record<string, unknown> = {
      author: `urn:li:person:${linkedinUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
          ...(mediaAsset && {
            media: [
              {
                status: 'READY',
                media: mediaAsset,
              },
            ],
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (response.status === 401) {
      throw Object.assign(new Error('LinkedIn API returned 401'), { status: 401 });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LinkedIn post creation failed (${response.status}): ${body}`);
    }

    const postId = response.headers.get('x-restli-id') ?? '';
    const postUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : 'https://www.linkedin.com/feed/';

    logger.info('publishing:linkedin', 'Post published to LinkedIn', {
      postUrl,
      contentLength: content.length,
      hasImage: !!mediaAsset,
    });

    return { postUrl };
  };

  try {
    return await doPublish(accessToken);
  } catch (err) {
    // On 401, attempt one token refresh and retry
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 401) {
      logger.warn('publishing:linkedin', 'Got 401, attempting token refresh');

      const tokens = getLinkedInTokens();
      if (!tokens?.refreshToken) {
        clearLinkedInTokens();
        throw new Error('LINKEDIN_TOKEN_EXPIRED');
      }

      try {
        const refreshed = await refreshLinkedInToken(tokens.refreshToken);
        return await doPublish(refreshed.accessToken);
      } catch {
        clearLinkedInTokens();
        throw new Error('LINKEDIN_TOKEN_EXPIRED');
      }
    }

    throw err;
  }
}
