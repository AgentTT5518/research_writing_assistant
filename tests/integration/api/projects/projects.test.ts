import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { projects, researchItems, drafts } from '@/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createProjectSchema, updateProjectSchema } from '@/features/content-management/types';

// These tests exercise the same logic as the API routes but against
// an in-memory database, without needing a running Next.js server.

describe('Projects API Logic', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(() => {
    db = createTestDb();
  });

  beforeEach(() => {
    // Clean projects table between tests
    db.delete(projects).run();
  });

  describe('GET /api/projects (list)', () => {
    it('returns empty array when no projects exist', () => {
      const result = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
      expect(result).toEqual([]);
    });

    it('returns projects ordered by createdAt descending', () => {
      const now = new Date();
      const earlier = new Date(Date.now() - 60000);

      db.insert(projects).values({
        id: nanoid(), name: 'Older', status: 'active', createdAt: earlier, updatedAt: earlier,
      }).run();
      db.insert(projects).values({
        id: nanoid(), name: 'Newer', status: 'active', createdAt: now, updatedAt: now,
      }).run();

      const result = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Newer');
      expect(result[1].name).toBe('Older');
    });
  });

  describe('POST /api/projects (create)', () => {
    it('validates required name field', () => {
      const parsed = createProjectSchema.safeParse({});
      expect(parsed.success).toBe(false);
    });

    it('validates name max length', () => {
      const parsed = createProjectSchema.safeParse({ name: 'x'.repeat(201) });
      expect(parsed.success).toBe(false);
    });

    it('creates a project with valid data', () => {
      const parsed = createProjectSchema.safeParse({
        name: 'New Project',
        description: 'Test description',
      });
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const now = new Date();
      const project = {
        id: nanoid(),
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(projects).values(project).run();

      const stored = db.select().from(projects).where(eq(projects.id, project.id)).get();
      expect(stored).toBeDefined();
      expect(stored!.name).toBe('New Project');
      expect(stored!.description).toBe('Test description');
      expect(stored!.status).toBe('active');
    });

    it('creates a project without description', () => {
      const parsed = createProjectSchema.safeParse({ name: 'No Desc' });
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const now = new Date();
      db.insert(projects).values({
        id: nanoid(),
        name: parsed.data.name,
        description: null,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }).run();

      const all = db.select().from(projects).all();
      expect(all.some(p => p.name === 'No Desc' && p.description === null)).toBe(true);
    });
  });

  describe('GET /api/projects/[id] (detail with counts)', () => {
    it('returns project with research and draft counts', () => {
      const projectId = nanoid();
      const now = new Date();

      db.insert(projects).values({
        id: projectId, name: 'Counted', status: 'active', createdAt: now, updatedAt: now,
      }).run();

      // Add 2 research items
      db.insert(researchItems).values([
        { id: nanoid(), projectId, sourceType: 'web', title: 'R1', createdAt: now },
        { id: nanoid(), projectId, sourceType: 'url', title: 'R2', createdAt: now },
      ]).run();

      // Add 1 draft
      db.insert(drafts).values({
        id: nanoid(), projectId, status: 'draft', createdAt: now, updatedAt: now,
      }).run();

      const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
      expect(project).toBeDefined();

      const researchCount = db
        .select({ count: count() })
        .from(researchItems)
        .where(eq(researchItems.projectId, projectId))
        .get();
      const draftCount = db
        .select({ count: count() })
        .from(drafts)
        .where(eq(drafts.projectId, projectId))
        .get();

      expect(researchCount!.count).toBe(2);
      expect(draftCount!.count).toBe(1);
    });

    it('returns null for nonexistent project', () => {
      const result = db.select().from(projects).where(eq(projects.id, 'nonexistent')).get();
      expect(result).toBeUndefined();
    });
  });

  describe('PUT /api/projects/[id] (update)', () => {
    it('validates update schema accepts partial fields', () => {
      const parsed = updateProjectSchema.safeParse({ name: 'Updated' });
      expect(parsed.success).toBe(true);
    });

    it('updates only provided fields', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(projects).values({
        id, name: 'Original', description: 'Original desc', status: 'active',
        createdAt: now, updatedAt: now,
      }).run();

      const parsed = updateProjectSchema.safeParse({ name: 'Updated Name' });
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      db.update(projects)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .run();

      const updated = db.select().from(projects).where(eq(projects.id, id)).get();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.description).toBe('Original desc'); // unchanged
    });

    it('can archive a project', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(projects).values({
        id, name: 'Archivable', status: 'active', createdAt: now, updatedAt: now,
      }).run();

      db.update(projects).set({ status: 'archived', updatedAt: new Date() }).where(eq(projects.id, id)).run();

      const result = db.select().from(projects).where(eq(projects.id, id)).get();
      expect(result!.status).toBe('archived');
    });

    it('rejects invalid status values', () => {
      const parsed = updateProjectSchema.safeParse({ status: 'deleted' });
      expect(parsed.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/[id] (delete with cascade)', () => {
    it('deletes the project', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(projects).values({
        id, name: 'To Delete', status: 'active', createdAt: now, updatedAt: now,
      }).run();

      db.delete(projects).where(eq(projects.id, id)).run();

      const result = db.select().from(projects).where(eq(projects.id, id)).get();
      expect(result).toBeUndefined();
    });

    it('cascades to research items and drafts', () => {
      const projectId = nanoid();
      const now = new Date();

      db.insert(projects).values({
        id: projectId, name: 'Cascade', status: 'active', createdAt: now, updatedAt: now,
      }).run();

      db.insert(researchItems).values({
        id: nanoid(), projectId, sourceType: 'academic', title: 'Paper', createdAt: now,
      }).run();

      db.insert(drafts).values({
        id: nanoid(), projectId, status: 'draft', createdAt: now, updatedAt: now,
      }).run();

      db.delete(projects).where(eq(projects.id, projectId)).run();

      const ri = db.select({ count: count() }).from(researchItems)
        .where(eq(researchItems.projectId, projectId)).get();
      const d = db.select({ count: count() }).from(drafts)
        .where(eq(drafts.projectId, projectId)).get();

      expect(ri!.count).toBe(0);
      expect(d!.count).toBe(0);
    });

    it('handles nonexistent project gracefully', () => {
      // This mimics the API route behavior: check if exists first
      const existing = db.select({ id: projects.id }).from(projects)
        .where(eq(projects.id, 'nonexistent')).get();
      expect(existing).toBeUndefined();
    });
  });
});
