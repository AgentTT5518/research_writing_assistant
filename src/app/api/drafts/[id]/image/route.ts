import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/shared/lib/db';
import { drafts } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes for image validation
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47];
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];

function isWebP(buf: Uint8Array): boolean {
  return (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  );
}

function isPNG(buf: Uint8Array): boolean {
  return PNG_MAGIC.every((byte, i) => buf[i] === byte);
}

function isJPEG(buf: Uint8Array): boolean {
  return JPEG_MAGIC.every((byte, i) => buf[i] === byte);
}

function isValidImage(buf: Uint8Array): boolean {
  if (buf.length < 12) return false;
  return isPNG(buf) || isJPEG(buf) || isWebP(buf);
}

function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    // Verify draft exists
    const draft = db.select().from(drafts).where(eq(drafts.id, id)).get();
    if (!draft) {
      return createErrorResponse('RESOURCE_NOT_FOUND', `Draft ${id} not found`, 404);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return createErrorResponse('VALIDATION_ERROR', 'No file provided', 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse('VALIDATION_ERROR', 'File exceeds 5MB limit', 400);
    }

    // Read file buffer and validate magic bytes
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!isValidImage(buffer)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid file type. Only PNG, JPEG, and WebP images are accepted.',
        400,
      );
    }

    // Sanitize filename and save
    const safeName = sanitizeFilename(file.name);
    const imageDir = path.join(process.cwd(), 'data', 'images', id);
    await mkdir(imageDir, { recursive: true });

    const imagePath = path.join(imageDir, safeName);
    await writeFile(imagePath, buffer);

    // Update draft with image path
    const relativePath = `data/images/${id}/${safeName}`;
    db.update(drafts)
      .set({ coverImagePath: relativePath, updatedAt: new Date() })
      .where(eq(drafts.id, id))
      .run();

    logger.info('writing', 'Cover image uploaded', {
      draftId: id,
      filename: safeName,
      size: file.size,
    });

    return createSuccessResponse({ path: relativePath }, 201);
  } catch (err) {
    logger.error('writing', 'Failed to upload cover image', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to upload cover image', 500);
  }
}
