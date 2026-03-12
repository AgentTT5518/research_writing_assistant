import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb } from '../../../helpers/test-db';
import { appConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { configUpdateSchema } from '@/features/publishing/types';

describe('Config API Logic', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(() => {
    db = createTestDb();
  });

  beforeEach(() => {
    db.delete(appConfig).run();
  });

  describe('GET /api/config (list)', () => {
    it('returns empty config when no entries exist', () => {
      const rows = db.select().from(appConfig).all();
      expect(rows).toEqual([]);
    });

    it('returns all config entries', () => {
      const now = new Date();
      db.insert(appConfig).values({ key: 'ai_model', value: '"claude-sonnet"', updatedAt: now }).run();
      db.insert(appConfig).values({ key: 'ai_temperature', value: '0.7', updatedAt: now }).run();

      const rows = db.select().from(appConfig).all();
      expect(rows).toHaveLength(2);
    });

    it('stores JSON-serializable values', () => {
      const now = new Date();
      const banList = JSON.stringify(['synergy', 'leverage']);
      db.insert(appConfig).values({ key: 'ban_list', value: banList, updatedAt: now }).run();

      const row = db.select().from(appConfig).where(eq(appConfig.key, 'ban_list')).get();
      expect(row).toBeDefined();
      expect(JSON.parse(row!.value)).toEqual(['synergy', 'leverage']);
    });
  });

  describe('PUT /api/config (upsert)', () => {
    it('validates config update schema', () => {
      const valid = configUpdateSchema.safeParse({ key: 'ai_model', value: 'claude-sonnet' });
      expect(valid.success).toBe(true);

      const invalid = configUpdateSchema.safeParse({ key: '', value: 'x' });
      expect(invalid.success).toBe(false);
    });

    it('inserts new config entry', () => {
      const now = new Date();
      db.insert(appConfig)
        .values({ key: 'new_key', value: '"new_value"', updatedAt: now })
        .onConflictDoUpdate({ target: appConfig.key, set: { value: '"new_value"', updatedAt: now } })
        .run();

      const row = db.select().from(appConfig).where(eq(appConfig.key, 'new_key')).get();
      expect(row).toBeDefined();
      expect(row!.value).toBe('"new_value"');
    });

    it('updates existing config entry', () => {
      const now = new Date();
      db.insert(appConfig).values({ key: 'ai_model', value: '"old"', updatedAt: now }).run();

      const later = new Date(Date.now() + 1000);
      db.insert(appConfig)
        .values({ key: 'ai_model', value: '"new"', updatedAt: later })
        .onConflictDoUpdate({ target: appConfig.key, set: { value: '"new"', updatedAt: later } })
        .run();

      const row = db.select().from(appConfig).where(eq(appConfig.key, 'ai_model')).get();
      expect(row!.value).toBe('"new"');
    });

    it('handles object values serialized as JSON', () => {
      const now = new Date();
      const tokens = JSON.stringify({ accessToken: 'abc', expiresAt: Date.now() + 60000 });
      db.insert(appConfig)
        .values({ key: 'linkedin_tokens', value: tokens, updatedAt: now })
        .run();

      const row = db.select().from(appConfig).where(eq(appConfig.key, 'linkedin_tokens')).get();
      const parsed = JSON.parse(row!.value);
      expect(parsed.accessToken).toBe('abc');
    });
  });
});
