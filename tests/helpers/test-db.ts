import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  // Read and apply migration SQL
  const migrationsDir = join(process.cwd(), 'src/db/migrations');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    sqlite.exec(sql);
  }

  return drizzle(sqlite, { schema });
}
