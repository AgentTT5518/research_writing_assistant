import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { nanoid } from 'nanoid';
import * as schema from './schema';
import { projects, appConfig } from './schema';
import { count } from 'drizzle-orm';

const sqlite = new Database('./dev.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

async function seed() {
  // Check if projects already exist
  const [existing] = await db.select({ count: count() }).from(projects);
  if (existing.count > 0) {
    console.log('Database already seeded, skipping.');
    sqlite.close();
    return;
  }

  const now = new Date();

  // Seed sample projects
  await db.insert(projects).values([
    {
      id: nanoid(),
      name: 'AI in Healthcare',
      description: 'Research and write about AI applications in healthcare, diagnostics, and patient outcomes.',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: 'Future of Remote Work',
      description: 'Explore trends in remote work, hybrid models, and their impact on productivity and culture.',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Seed default app config
  await db.insert(appConfig).values([
    {
      key: 'ai_model',
      value: JSON.stringify('claude-sonnet-4-20250514'),
      updatedAt: now,
    },
    {
      key: 'ai_temperature',
      value: JSON.stringify(0.7),
      updatedAt: now,
    },
  ]);

  console.log('Seed complete: 2 projects + default config inserted.');
  sqlite.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
