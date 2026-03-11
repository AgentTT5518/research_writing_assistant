import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { researchItems, tags, researchItemTags, projects } from '@/db/schema';
import { eq, desc, like, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createResearchItemSchema,
  updateResearchItemSchema,
} from '@/features/research/types';

describe('Research API Logic', () => {
  let db: ReturnType<typeof createTestDb>;
  const projectId = nanoid();

  beforeAll(() => {
    db = createTestDb();

    // Create a project for research items to belong to
    db.insert(projects)
      .values({
        id: projectId,
        name: 'Test Project',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();
  });

  beforeEach(() => {
    // Clean research-related tables between tests
    db.delete(researchItemTags).run();
    db.delete(researchItems).run();
    db.delete(tags).run();
  });

  describe('GET /api/research (list)', () => {
    it('returns empty array when no items exist', () => {
      const result = db.select().from(researchItems).orderBy(desc(researchItems.createdAt)).all();
      expect(result).toEqual([]);
    });

    it('returns items ordered by createdAt descending', () => {
      const now = new Date();
      const earlier = new Date(Date.now() - 60000);

      db.insert(researchItems).values([
        { id: nanoid(), projectId, sourceType: 'web', title: 'Older', createdAt: earlier },
        { id: nanoid(), projectId, sourceType: 'web', title: 'Newer', createdAt: now },
      ]).run();

      const result = db.select().from(researchItems).orderBy(desc(researchItems.createdAt)).all();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Newer');
      expect(result[1].title).toBe('Older');
    });

    it('filters by projectId', () => {
      const otherId = nanoid();
      const now = new Date();

      // Create the other project so FK constraint is satisfied
      db.insert(projects).values({
        id: otherId, name: 'Other Project', status: 'active', createdAt: now, updatedAt: now,
      }).run();

      db.insert(researchItems).values([
        { id: nanoid(), projectId, sourceType: 'web', title: 'Mine', createdAt: now },
        { id: nanoid(), projectId: otherId, sourceType: 'web', title: 'Other', createdAt: now },
      ]).run();

      const result = db
        .select()
        .from(researchItems)
        .where(eq(researchItems.projectId, projectId))
        .all();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Mine');
    });

    it('filters by sourceType', () => {
      const now = new Date();

      db.insert(researchItems).values([
        { id: nanoid(), projectId, sourceType: 'web', title: 'Web Item', createdAt: now },
        { id: nanoid(), projectId, sourceType: 'academic', title: 'Academic Item', createdAt: now },
      ]).run();

      const result = db
        .select()
        .from(researchItems)
        .where(eq(researchItems.sourceType, 'academic'))
        .all();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Academic Item');
    });

    it('filters by search text (title)', () => {
      const now = new Date();

      db.insert(researchItems).values([
        { id: nanoid(), projectId, sourceType: 'web', title: 'Machine Learning Guide', createdAt: now },
        { id: nanoid(), projectId, sourceType: 'web', title: 'Cooking Recipes', createdAt: now },
      ]).run();

      const result = db
        .select()
        .from(researchItems)
        .where(like(researchItems.title, '%Machine%'))
        .all();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Machine Learning Guide');
    });
  });

  describe('POST /api/research (create)', () => {
    it('validates required fields', () => {
      const noProject = createResearchItemSchema.safeParse({ sourceType: 'web', title: 'Test' });
      expect(noProject.success).toBe(false);

      const noTitle = createResearchItemSchema.safeParse({ projectId: 'x', sourceType: 'web' });
      expect(noTitle.success).toBe(false);
    });

    it('creates a research item', () => {
      const now = new Date();
      const id = nanoid();

      db.insert(researchItems).values({
        id,
        projectId,
        sourceType: 'web',
        title: 'Test Article',
        url: 'https://example.com',
        summary: 'A summary',
        createdAt: now,
      }).run();

      const stored = db.select().from(researchItems).where(eq(researchItems.id, id)).get();
      expect(stored).toBeDefined();
      expect(stored!.title).toBe('Test Article');
      expect(stored!.sourceType).toBe('web');
      expect(stored!.url).toBe('https://example.com');
    });

    it('creates research item with tags', () => {
      const itemId = nanoid();
      const tagId1 = nanoid();
      const tagId2 = nanoid();
      const now = new Date();

      db.insert(researchItems).values({
        id: itemId,
        projectId,
        sourceType: 'academic',
        title: 'Tagged Paper',
        createdAt: now,
      }).run();

      db.insert(tags).values([
        { id: tagId1, name: 'AI' },
        { id: tagId2, name: 'NLP' },
      ]).run();

      db.insert(researchItemTags).values([
        { researchItemId: itemId, tagId: tagId1 },
        { researchItemId: itemId, tagId: tagId2 },
      ]).run();

      const itemTags = db
        .select({ id: tags.id, name: tags.name })
        .from(researchItemTags)
        .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
        .where(eq(researchItemTags.researchItemId, itemId))
        .all();

      expect(itemTags).toHaveLength(2);
      expect(itemTags.map((t) => t.name).sort()).toEqual(['AI', 'NLP']);
    });
  });

  describe('GET /api/research/[id] (detail)', () => {
    it('returns item with tags', () => {
      const itemId = nanoid();
      const tagId = nanoid();
      const now = new Date();

      db.insert(researchItems).values({
        id: itemId, projectId, sourceType: 'url', title: 'Detailed Item',
        url: 'https://example.com', summary: 'Summary', createdAt: now,
      }).run();

      db.insert(tags).values({ id: tagId, name: 'Research' }).run();
      db.insert(researchItemTags).values({ researchItemId: itemId, tagId }).run();

      const item = db.select().from(researchItems).where(eq(researchItems.id, itemId)).get();
      expect(item).toBeDefined();
      expect(item!.title).toBe('Detailed Item');

      const itemTags = db
        .select({ id: tags.id, name: tags.name })
        .from(researchItemTags)
        .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
        .where(eq(researchItemTags.researchItemId, itemId))
        .all();

      expect(itemTags).toHaveLength(1);
      expect(itemTags[0].name).toBe('Research');
    });

    it('returns undefined for nonexistent item', () => {
      const result = db.select().from(researchItems).where(eq(researchItems.id, 'nonexistent')).get();
      expect(result).toBeUndefined();
    });
  });

  describe('PUT /api/research/[id] (update)', () => {
    it('updates title', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(researchItems).values({
        id, projectId, sourceType: 'web', title: 'Original', createdAt: now,
      }).run();

      const parsed = updateResearchItemSchema.safeParse({ title: 'Updated Title' });
      expect(parsed.success).toBe(true);

      db.update(researchItems).set({ title: 'Updated Title' }).where(eq(researchItems.id, id)).run();

      const updated = db.select().from(researchItems).where(eq(researchItems.id, id)).get();
      expect(updated!.title).toBe('Updated Title');
    });

    it('replaces tags on update', () => {
      const itemId = nanoid();
      const oldTagId = nanoid();
      const newTagId = nanoid();
      const now = new Date();

      db.insert(researchItems).values({
        id: itemId, projectId, sourceType: 'web', title: 'Tagged', createdAt: now,
      }).run();

      db.insert(tags).values([
        { id: oldTagId, name: 'OldTag' },
        { id: newTagId, name: 'NewTag' },
      ]).run();

      db.insert(researchItemTags).values({ researchItemId: itemId, tagId: oldTagId }).run();

      // Simulate tag replacement
      db.delete(researchItemTags).where(eq(researchItemTags.researchItemId, itemId)).run();
      db.insert(researchItemTags).values({ researchItemId: itemId, tagId: newTagId }).run();

      const itemTags = db
        .select({ name: tags.name })
        .from(researchItemTags)
        .innerJoin(tags, eq(researchItemTags.tagId, tags.id))
        .where(eq(researchItemTags.researchItemId, itemId))
        .all();

      expect(itemTags).toHaveLength(1);
      expect(itemTags[0].name).toBe('NewTag');
    });
  });

  describe('DELETE /api/research/[id]', () => {
    it('deletes the research item', () => {
      const id = nanoid();
      const now = new Date();

      db.insert(researchItems).values({
        id, projectId, sourceType: 'web', title: 'To Delete', createdAt: now,
      }).run();

      db.delete(researchItems).where(eq(researchItems.id, id)).run();

      const result = db.select().from(researchItems).where(eq(researchItems.id, id)).get();
      expect(result).toBeUndefined();
    });

    it('cascades to tag links', () => {
      const itemId = nanoid();
      const tagId = nanoid();
      const now = new Date();

      db.insert(researchItems).values({
        id: itemId, projectId, sourceType: 'web', title: 'Cascade Test', createdAt: now,
      }).run();

      db.insert(tags).values({ id: tagId, name: 'CascadeTag' }).run();
      db.insert(researchItemTags).values({ researchItemId: itemId, tagId }).run();

      // Delete research item — should cascade to junction table
      db.delete(researchItems).where(eq(researchItems.id, itemId)).run();

      const links = db
        .select()
        .from(researchItemTags)
        .where(eq(researchItemTags.researchItemId, itemId))
        .all();

      expect(links).toHaveLength(0);

      // Tag itself should still exist
      const tag = db.select().from(tags).where(eq(tags.id, tagId)).get();
      expect(tag).toBeDefined();
    });
  });

  describe('Tag management', () => {
    it('enforces unique tag names', () => {
      const id1 = nanoid();
      db.insert(tags).values({ id: id1, name: 'UniqueTag' }).run();

      expect(() => {
        db.insert(tags).values({ id: nanoid(), name: 'UniqueTag' }).run();
      }).toThrow();
    });

    it('finds or creates tags by name', () => {
      const tagName = 'FindOrCreate';

      // First check — doesn't exist
      let existing = db.select().from(tags).where(eq(tags.name, tagName)).get();
      expect(existing).toBeUndefined();

      // Create it
      const newId = nanoid();
      db.insert(tags).values({ id: newId, name: tagName }).run();

      // Now it exists
      existing = db.select().from(tags).where(eq(tags.name, tagName)).get();
      expect(existing).toBeDefined();
      expect(existing!.name).toBe(tagName);
    });
  });
});
