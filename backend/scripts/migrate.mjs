import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './db-common.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../src/database/migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "version" varchar(255) PRIMARY KEY,
      "checksum" varchar(64) NOT NULL,
      "applied_at" timestamp DEFAULT now() NOT NULL
    );
  `);
}

async function appliedVersions(client) {
  const result = await client.query('SELECT "version", "checksum" FROM "schema_migrations"');
  return new Map(result.rows.map(row => [row.version, row.checksum]));
}

async function migrationFiles() {
  const files = await readdir(migrationsDir);
  return files.filter(file => file.endsWith('.sql')).sort();
}

function checksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function run() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await appliedVersions(client);
    const files = await migrationFiles();

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      const hash = checksum(sql);

      if (applied.get(version) === hash) {
        console.log(`Already applied: ${version}`);
        continue;
      }

      if (applied.has(version) && applied.get(version) !== hash) {
        throw new Error(`Migration checksum changed after apply: ${version}`);
      }

      console.log(`Applying migration: ${version}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "schema_migrations" ("version", "checksum") VALUES ($1, $2)',
          [version, hash],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Database migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
