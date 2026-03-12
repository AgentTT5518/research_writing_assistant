import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase-admin modules before importing
const mockAdd = vi.fn();
const mockCollection = vi.fn(() => ({ add: mockAdd }));
const mockFirestoreInstance = { collection: mockCollection };
const mockSave = vi.fn();
const mockMakePublic = vi.fn();
const mockFile = vi.fn(() => ({ save: mockSave, makePublic: mockMakePublic }));
const mockBucket = vi.fn(() => ({ file: mockFile, name: 'test-project.firebasestorage.app' }));
const mockStorageInstance = { bucket: mockBucket };

vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: vi.fn(() => ({ name: 'test-app' })),
    credential: {
      cert: vi.fn((sa: unknown) => sa),
    },
  },
  apps: [],
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  credential: {
    cert: vi.fn((sa: unknown) => sa),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestoreInstance),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => mockStorageInstance),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(() => Promise.resolve(Buffer.from('fake-image-data'))),
}));

describe('Firebase Admin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'key-id',
      private_key: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
      client_email: 'test@test-project.iam.gserviceaccount.com',
    });

    vi.clearAllMocks();

    // Reset globalThis singletons
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.__firebaseApp;
    delete g.__firestore;
    delete g.__storage;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('publishBlogPost', () => {
    it('writes a blog post to Firestore and returns postId', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'abc123' });

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      const result = await publishBlogPost({
        title: 'Test Post',
        content: '<p>Hello world</p>',
      });

      expect(result.postId).toBe('abc123');
      expect(mockCollection).toHaveBeenCalledWith('posts');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Post',
          content: '<p>Hello world</p>',
          author: 'Author',
          published: true,
        })
      );
    });

    it('includes excerpt when provided', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'def456' });

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      await publishBlogPost({
        title: 'Test',
        content: '<p>Content</p>',
        excerpt: 'Short summary',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({ excerpt: 'Short summary' })
      );
    });

    it('includes imageUrl when provided', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'ghi789' });

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      await publishBlogPost({
        title: 'Test',
        content: '<p>Content</p>',
        imageUrl: 'https://storage.googleapis.com/bucket/image.png',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://storage.googleapis.com/bucket/image.png',
        })
      );
    });

    it('uses custom author when provided', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'jkl012' });

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      await publishBlogPost({
        title: 'Test',
        content: '<p>Content</p>',
        author: 'Jane Doe',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'Jane Doe' })
      );
    });

    it('retries on Firestore failure', async () => {
      mockAdd
        .mockRejectedValueOnce(new Error('Firestore unavailable'))
        .mockResolvedValueOnce({ id: 'retry-ok' });

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      const result = await publishBlogPost({
        title: 'Retry Test',
        content: '<p>Content</p>',
      });

      expect(result.postId).toBe('retry-ok');
      expect(mockAdd).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      mockAdd.mockRejectedValue(new Error('Firestore down'));

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      await expect(
        publishBlogPost({ title: 'Fail', content: '<p>Fail</p>' })
      ).rejects.toThrow('Firestore down');
    }, 15000);
  });

  describe('uploadImageToStorage', () => {
    it('uploads image and returns public URL', async () => {
      mockSave.mockResolvedValueOnce(undefined);
      mockMakePublic.mockResolvedValueOnce(undefined);

      const { uploadImageToStorage } = await import('@/shared/lib/firebase-admin');
      const url = await uploadImageToStorage('data/images/draft1/photo.jpg', 'draft1');

      expect(url).toContain('storage.googleapis.com');
      expect(url).toContain('draft1-photo.jpg');
      expect(mockSave).toHaveBeenCalled();
      expect(mockMakePublic).toHaveBeenCalled();
    });

    it('sets correct content type based on extension', async () => {
      mockSave.mockResolvedValueOnce(undefined);
      mockMakePublic.mockResolvedValueOnce(undefined);

      const { uploadImageToStorage } = await import('@/shared/lib/firebase-admin');
      await uploadImageToStorage('data/images/draft1/photo.png', 'draft1');

      expect(mockSave).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({ contentType: 'image/png' }),
        })
      );
    });

    it('retries upload on failure', async () => {
      mockSave
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce(undefined);
      mockMakePublic.mockResolvedValue(undefined);

      const { uploadImageToStorage } = await import('@/shared/lib/firebase-admin');
      const url = await uploadImageToStorage('data/images/draft1/photo.jpg', 'draft1');

      expect(url).toContain('storage.googleapis.com');
    });
  });

  describe('parseServiceAccountKey', () => {
    it('throws when FIREBASE_SERVICE_ACCOUNT_KEY is not set', async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      // Reset singletons to force re-init
      const g = globalThis as unknown as Record<string, unknown>;
      delete g.__firebaseApp;
      delete g.__firestore;

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      await expect(
        publishBlogPost({ title: 'Test', content: '<p>Test</p>' })
      ).rejects.toThrow('FIREBASE_SERVICE_ACCOUNT_KEY is not configured');
    });

    it('parses base64-encoded service account key', async () => {
      const sa = { type: 'service_account', project_id: 'b64-project' };
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = Buffer.from(JSON.stringify(sa)).toString('base64');

      const g = globalThis as unknown as Record<string, unknown>;
      delete g.__firebaseApp;
      delete g.__firestore;

      mockAdd.mockResolvedValueOnce({ id: 'b64-test' });

      const { publishBlogPost } = await import('@/shared/lib/firebase-admin');
      const result = await publishBlogPost({ title: 'B64', content: '<p>B64</p>' });
      expect(result.postId).toBe('b64-test');
    });
  });
});
