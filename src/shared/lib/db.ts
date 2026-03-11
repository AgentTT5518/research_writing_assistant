import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { logger } from '@/shared/lib/logger';

const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createDb() {
  const dbPath = process.env.DATABASE_URL || './dev.db';
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  logger.info('db', 'Database connected', { path: dbPath });
  return drizzle(sqlite, { schema });
}

export const db = globalForDb._db ?? (globalForDb._db = createDb());
