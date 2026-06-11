import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { createPool, requiredEnv, requireLicensePepper } from './db-common.mjs';
import { generateLicenseKey, hashSecret, licensePrefix } from './license-crypto.mjs';

const PAGE_SIZE = 1000;

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function outputPath() {
  if (process.env.BACKFILL_LICENSE_OUTPUT?.trim()) {
    return path.resolve(process.env.BACKFILL_LICENSE_OUTPUT.trim());
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(`license-backfill-${stamp}.csv`);
}

async function listSupabaseUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`Failed to list Supabase users: ${error.message}`);

    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < PAGE_SIZE) break;
  }
  return users;
}

async function hasActiveLicense(client, email) {
  const result = await client.query(
    `
      SELECT 1
      FROM "licenses"
      WHERE "customer_email" = $1
        AND "status" = 'active'
        AND ("expires_at" IS NULL OR "expires_at" > now())
      LIMIT 1
    `,
    [email],
  );
  return result.rowCount > 0;
}

async function createLicense(client, pepper, user) {
  const email = user.email.trim().toLowerCase();
  const licenseKey = generateLicenseKey();
  const prefix = licensePrefix(licenseKey);
  const metadata = {
    source: 'supabase_user_backfill',
    supabaseUserId: user.id,
    generatedAt: new Date().toISOString(),
  };

  await client.query('BEGIN');
  try {
    const result = await client.query(
      `
        INSERT INTO "licenses" (
          "customer_email",
          "license_hash",
          "license_prefix",
          "plan",
          "status",
          "seats",
          "max_devices",
          "metadata"
        )
        VALUES ($1, $2, $3, 'solo', 'active', 1, 2, $4::jsonb)
        RETURNING "id"
      `,
      [email, hashSecret(licenseKey, pepper), prefix, JSON.stringify(metadata)],
    );
    const licenseId = result.rows[0].id;
    await client.query(
      `
        INSERT INTO "license_events" ("license_id", "activation_id", "event_type", "metadata")
        VALUES ($1, NULL, 'license.backfilled', $2::jsonb)
      `,
      [licenseId, JSON.stringify(metadata)],
    );
    await client.query('COMMIT');

    return { email, licenseId, licenseKey, licensePrefix: prefix };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function run() {
  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });
  const pepper = requireLicensePepper();
  const pool = createPool();
  const client = await pool.connect();
  const created = [];
  let skippedWithoutEmail = 0;
  let skippedWithLicense = 0;

  try {
    const users = await listSupabaseUsers(supabase);

    for (const user of users) {
      const email = user.email?.trim().toLowerCase();
      if (!email) {
        skippedWithoutEmail += 1;
        continue;
      }

      if (await hasActiveLicense(client, email)) {
        skippedWithLicense += 1;
        continue;
      }

      created.push(await createLicense(client, pepper, user));
    }
  } finally {
    client.release();
    await pool.end();
  }

  if (created.length > 0) {
    const destination = outputPath();
    const rows = [
      ['email', 'license_id', 'license_prefix', 'license_key'].map(csvEscape).join(','),
      ...created.map(row => [row.email, row.licenseId, row.licensePrefix, row.licenseKey].map(csvEscape).join(',')),
    ];
    await writeFile(destination, `${rows.join('\n')}\n`, { flag: 'wx' });
    console.log(`Created ${created.length} licenses. One-time raw keys exported to ${destination}`);
  } else {
    console.log('No licenses created.');
  }

  console.log(`Skipped existing active licenses: ${skippedWithLicense}`);
  console.log(`Skipped users without email: ${skippedWithoutEmail}`);
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
