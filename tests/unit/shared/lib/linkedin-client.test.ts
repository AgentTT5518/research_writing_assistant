import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { appConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Mock the db module to use test db
let testDb: ReturnType<typeof createTestDb>;

vi.mock('@/shared/lib/db', () => ({
  get db() {
    return testDb;
  },
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(() => Promise.resolve(Buffer.from('fake-image-data'))),
}));

describe('LinkedIn Client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    testDb = createTestDb();
    process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3000/api/publish/linkedin/callback';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getLinkedInAuthUrl', () => {
    it('builds OAuth URL with correct parameters', async () => {
      const { getLinkedInAuthUrl } = await import('@/shared/lib/linkedin-client');
      const url = getLinkedInAuthUrl();

      expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+profile+w_member_social');
    });

    it('throws when LINKEDIN_CLIENT_ID is not set', async () => {
      delete process.env.LINKEDIN_CLIENT_ID;
      const { getLinkedInAuthUrl } = await import('@/shared/lib/linkedin-client');
      expect(() => getLinkedInAuthUrl()).toThrow('LINKEDIN_CLIENT_ID is not configured');
    });

    it('throws when LINKEDIN_REDIRECT_URI is not set', async () => {
      delete process.env.LINKEDIN_REDIRECT_URI;
      const { getLinkedInAuthUrl } = await import('@/shared/lib/linkedin-client');
      expect(() => getLinkedInAuthUrl()).toThrow('LINKEDIN_REDIRECT_URI is not configured');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('exchanges code and saves tokens', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // Token exchange response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'acc-123',
            refresh_token: 'ref-456',
            expires_in: 3600,
          }),
          { status: 200 }
        )
      );
      // Profile response
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ sub: 'user-urn-789' }), { status: 200 })
      );

      const { exchangeCodeForToken } = await import('@/shared/lib/linkedin-client');
      const tokens = await exchangeCodeForToken('auth-code-123');

      expect(tokens.accessToken).toBe('acc-123');
      expect(tokens.refreshToken).toBe('ref-456');
      expect(tokens.linkedinUrn).toBe('user-urn-789');

      // Verify tokens saved to DB
      const row = testDb.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      expect(row).toBeDefined();
      const saved = JSON.parse(row!.value);
      expect(saved.accessToken).toBe('acc-123');
    });

    it('throws on failed token exchange', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Invalid code', { status: 400 })
      );

      const { exchangeCodeForToken } = await import('@/shared/lib/linkedin-client');
      await expect(exchangeCodeForToken('bad-code')).rejects.toThrow(
        'LinkedIn token exchange failed (400)'
      );
    });

    it('throws on failed profile fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'acc-123', expires_in: 3600 }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const { exchangeCodeForToken } = await import('@/shared/lib/linkedin-client');
      await expect(exchangeCodeForToken('code')).rejects.toThrow(
        'LinkedIn profile fetch failed (401)'
      );
    });
  });

  describe('refreshLinkedInToken', () => {
    it('refreshes token and saves updated tokens', async () => {
      // Save initial tokens
      testDb.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'old-acc',
          refreshToken: 'ref-tok',
          expiresAt: Date.now() - 1000,
          linkedinUrn: 'user-urn',
        }),
        updatedAt: new Date(),
      }).run();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'new-acc',
            refresh_token: 'new-ref',
            expires_in: 3600,
          }),
          { status: 200 }
        )
      );

      const { refreshLinkedInToken } = await import('@/shared/lib/linkedin-client');
      const tokens = await refreshLinkedInToken('ref-tok');

      expect(tokens.accessToken).toBe('new-acc');
      expect(tokens.linkedinUrn).toBe('user-urn');
    });

    it('clears tokens and throws on refresh failure', async () => {
      testDb.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'old',
          refreshToken: 'bad-ref',
          expiresAt: Date.now() - 1000,
          linkedinUrn: 'urn',
        }),
        updatedAt: new Date(),
      }).run();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Invalid refresh token', { status: 400 })
      );

      const { refreshLinkedInToken } = await import('@/shared/lib/linkedin-client');
      await expect(refreshLinkedInToken('bad-ref')).rejects.toThrow('LINKEDIN_TOKEN_EXPIRED');

      // Verify tokens cleared
      const row = testDb.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      expect(row).toBeUndefined();
    });
  });

  describe('token management', () => {
    it('getLinkedInTokens returns null when no tokens exist', async () => {
      const { getLinkedInTokens } = await import('@/shared/lib/linkedin-client');
      expect(getLinkedInTokens()).toBeNull();
    });

    it('saveLinkedInTokens creates new entry', async () => {
      const { saveLinkedInTokens, getLinkedInTokens } = await import('@/shared/lib/linkedin-client');
      saveLinkedInTokens({
        accessToken: 'acc',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
        linkedinUrn: 'urn-123',
      });

      const tokens = getLinkedInTokens();
      expect(tokens).not.toBeNull();
      expect(tokens!.accessToken).toBe('acc');
    });

    it('saveLinkedInTokens updates existing entry', async () => {
      const { saveLinkedInTokens, getLinkedInTokens } = await import('@/shared/lib/linkedin-client');
      saveLinkedInTokens({
        accessToken: 'first',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
        linkedinUrn: 'urn',
      });
      saveLinkedInTokens({
        accessToken: 'second',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
        linkedinUrn: 'urn',
      });

      const tokens = getLinkedInTokens();
      expect(tokens!.accessToken).toBe('second');
    });

    it('clearLinkedInTokens removes tokens', async () => {
      const { saveLinkedInTokens, clearLinkedInTokens, getLinkedInTokens } = await import('@/shared/lib/linkedin-client');
      saveLinkedInTokens({
        accessToken: 'acc',
        refreshToken: 'ref',
        expiresAt: Date.now() + 3600_000,
        linkedinUrn: 'urn',
      });

      clearLinkedInTokens();
      expect(getLinkedInTokens()).toBeNull();
    });
  });

  describe('publishLinkedInPost', () => {
    it('throws LINKEDIN_NOT_CONNECTED when no tokens', async () => {
      const { publishLinkedInPost } = await import('@/shared/lib/linkedin-client');
      await expect(publishLinkedInPost('Hello')).rejects.toThrow('LINKEDIN_NOT_CONNECTED');
    });

    it('publishes text-only post', async () => {
      // Set valid tokens
      testDb.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'valid-token',
          refreshToken: 'ref',
          expiresAt: Date.now() + 3600_000,
          linkedinUrn: 'user-urn',
        }),
        updatedAt: new Date(),
      }).run();

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      fetchSpy.mockResolvedValueOnce(
        new Response('', {
          status: 201,
          headers: { 'x-restli-id': 'urn:li:ugcPost:123' },
        })
      );

      const { publishLinkedInPost } = await import('@/shared/lib/linkedin-client');
      const result = await publishLinkedInPost('Test post content');

      expect(result.postUrl).toContain('linkedin.com/feed/update/urn:li:ugcPost:123');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/ugcPosts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    it('retries on 401 with token refresh', async () => {
      testDb.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'expired-token',
          refreshToken: 'ref-tok',
          expiresAt: Date.now() + 3600_000,
          linkedinUrn: 'user-urn',
        }),
        updatedAt: new Date(),
      }).run();

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // First attempt: 401
      fetchSpy.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      // Token refresh
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'new-token', expires_in: 3600 }),
          { status: 200 }
        )
      );
      // Retry with new token: success
      fetchSpy.mockResolvedValueOnce(
        new Response('', {
          status: 201,
          headers: { 'x-restli-id': 'urn:li:ugcPost:456' },
        })
      );

      const { publishLinkedInPost } = await import('@/shared/lib/linkedin-client');
      const result = await publishLinkedInPost('Test post');

      expect(result.postUrl).toContain('urn:li:ugcPost:456');
    });

    it('throws LINKEDIN_TOKEN_EXPIRED when refresh also fails', async () => {
      testDb.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'expired',
          refreshToken: 'expired-ref',
          expiresAt: Date.now() + 3600_000,
          linkedinUrn: 'urn',
        }),
        updatedAt: new Date(),
      }).run();

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // First: 401
      fetchSpy.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
      // Refresh: also fails
      fetchSpy.mockResolvedValueOnce(new Response('Invalid', { status: 400 }));

      const { publishLinkedInPost } = await import('@/shared/lib/linkedin-client');
      await expect(publishLinkedInPost('Test')).rejects.toThrow('LINKEDIN_TOKEN_EXPIRED');
    });

    it('auto-refreshes token when near expiry', async () => {
      // Set tokens that are about to expire (within 5-min buffer)
      testDb.insert(appConfig).values({
        key: 'linkedin_tokens',
        value: JSON.stringify({
          accessToken: 'about-to-expire',
          refreshToken: 'ref-tok',
          expiresAt: Date.now() + 60_000, // 1 minute from now (within 5-min buffer)
          linkedinUrn: 'user-urn',
        }),
        updatedAt: new Date(),
      }).run();

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // Token refresh
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'refreshed-token', expires_in: 3600 }),
          { status: 200 }
        )
      );
      // Post with refreshed token
      fetchSpy.mockResolvedValueOnce(
        new Response('', {
          status: 201,
          headers: { 'x-restli-id': 'urn:li:ugcPost:789' },
        })
      );

      const { publishLinkedInPost } = await import('@/shared/lib/linkedin-client');
      const result = await publishLinkedInPost('Test');

      expect(result.postUrl).toContain('urn:li:ugcPost:789');
    });
  });
});
