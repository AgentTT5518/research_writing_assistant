import { NextRequest } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { projects } from '@/db/schema';
import { logger } from '@/shared/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/shared/lib/api-utils';
import { generateId } from '@/shared/lib/id';
import { createProjectSchema } from '@/features/content-management/types';

export async function GET() {
  try {
    const allProjects = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
    return createSuccessResponse(allProjects);
  } catch (err) {
    logger.error('content-management', 'Failed to list projects', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to list projects', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const now = new Date();
    const project = {
      id: generateId(),
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(projects).values(project).run();
    logger.info('content-management', 'Project created', { projectId: project.id });
    return createSuccessResponse(project, 201);
  } catch (err) {
    logger.error('content-management', 'Failed to create project', err as Error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to create project', 500);
  }
}
