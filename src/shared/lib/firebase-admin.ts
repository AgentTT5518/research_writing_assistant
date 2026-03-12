/**
 * Firebase Admin SDK client — Firestore writes + Storage image uploads.
 * Uses globalThis singleton pattern (same as db.ts) for HMR safety.
 * Credentials loaded from FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON or base64).
 */
import { readFile } from 'fs/promises';
import path from 'path';
import { logger } from '@/shared/lib/logger';
import type { BlogPostData } from '@/features/publishing/types';

// Lazy-loaded firebase-admin types
type FirebaseApp = import('firebase-admin').app.App;
type Firestore = import('firebase-admin/firestore').Firestore;
type Storage = import('firebase-admin/storage').Storage;

const globalForFirebase = globalThis as unknown as {
  __firebaseApp: FirebaseApp | undefined;
  __firestore: Firestore | undefined;
  __storage: Storage | undefined;
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Parse the service account key from env var.
 * Supports both raw JSON and base64-encoded JSON.
 */
function parseServiceAccountKey(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not configured');
  }

  // Try raw JSON first
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Try base64 decoding
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8');
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-encoded JSON');
    }
  }
}

/**
 * Initialize Firebase Admin SDK singleton.
 */
async function getFirebaseApp(): Promise<FirebaseApp> {
  if (globalForFirebase.__firebaseApp) {
    return globalForFirebase.__firebaseApp;
  }

  const admin = await import('firebase-admin');
  const serviceAccount = parseServiceAccountKey();

  // Check if already initialized (e.g. by another import path)
  if (admin.apps.length > 0) {
    globalForFirebase.__firebaseApp = admin.apps[0]!;
    return globalForFirebase.__firebaseApp;
  }

  globalForFirebase.__firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as Parameters<typeof admin.credential.cert>[0]),
    storageBucket: (serviceAccount.project_id as string) + '.firebasestorage.app',
  });

  logger.info('publishing:firebase', 'Firebase Admin SDK initialized', {
    projectId: serviceAccount.project_id as string,
  });

  return globalForFirebase.__firebaseApp;
}

async function getFirestore(): Promise<Firestore> {
  if (globalForFirebase.__firestore) {
    return globalForFirebase.__firestore;
  }

  await getFirebaseApp();
  const { getFirestore: getFs } = await import('firebase-admin/firestore');
  globalForFirebase.__firestore = getFs();
  return globalForFirebase.__firestore;
}

async function getStorage(): Promise<Storage> {
  if (globalForFirebase.__storage) {
    return globalForFirebase.__storage;
  }

  await getFirebaseApp();
  const { getStorage: getStr } = await import('firebase-admin/storage');
  globalForFirebase.__storage = getStr();
  return globalForFirebase.__storage;
}

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
      logger.warn('publishing:firebase', `${label} failed, retrying in ${delay}ms`, {
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
 * Publish a blog post to Firestore.
 * Returns the Firestore document ID only — URL construction happens at the API route level.
 */
export async function publishBlogPost(
  data: BlogPostData
): Promise<{ postId: string }> {
  const firestore = await getFirestore();
  const { FieldValue } = await import('firebase-admin/firestore');

  const postData = {
    title: data.title,
    content: data.content,
    ...(data.excerpt && { excerpt: data.excerpt }),
    author: data.author ?? 'Author',
    published: true,
    ...(data.imageUrl && { imageUrl: data.imageUrl }),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await withRetry(
    () => firestore.collection('posts').add(postData),
    'Firestore write'
  );

  logger.info('publishing:firebase', 'Blog post published to Firestore', {
    postId: docRef.id,
    title: data.title,
  });

  return { postId: docRef.id };
}

/**
 * Upload a local image to Firebase Storage.
 * Reads from data/images/{draftId}/{filename} and uploads to /images/{year}/{month}/{filename}.
 * Returns the public download URL.
 */
export async function uploadImageToStorage(
  localPath: string,
  draftId: string
): Promise<string> {
  const storage = await getStorage();

  const fullPath = path.join(process.cwd(), localPath);
  const fileBuffer = await readFile(fullPath);

  const filename = path.basename(localPath);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const storagePath = `images/${year}/${month}/${draftId}-${filename}`;

  const bucket = storage.bucket();
  const file = bucket.file(storagePath);

  // Detect content type from extension
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  const contentType = contentTypes[ext] ?? 'application/octet-stream';

  await withRetry(
    async () => {
      await file.save(fileBuffer, {
        metadata: {
          contentType,
          metadata: { draftId },
        },
      });
      await file.makePublic();
    },
    'Storage upload'
  );

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  logger.info('publishing:firebase', 'Image uploaded to Firebase Storage', {
    draftId,
    storagePath,
    size: fileBuffer.length,
  });

  return publicUrl;
}
