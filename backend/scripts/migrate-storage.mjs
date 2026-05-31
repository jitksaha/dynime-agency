#!/usr/bin/env node
/**
 * Storage migration tool: Supabase Storage -> MinIO.
 *
 * SAFETY: Supabase is only ever READ. Nothing in Supabase Storage is moved,
 * deleted, or modified by this script. The destination MinIO objects and the
 * `public.app_storage_migration_map` tracking table are the only things written
 * to, and only in --execute mode.
 *
 * Modes:
 *   (default) --report   Read-only. Enumerate storage.objects and print a
 *                        reconciliation report (counts + bytes per bucket).
 *                        Writes nothing anywhere.
 *   --execute            Copy each object Supabase -> MinIO, verify by size,
 *                        and record results in app_storage_migration_map.
 *                        Idempotent: already-verified objects are skipped.
 *
 * Required env: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   MINIO_ENDPOINT/PORT/ACCESS_KEY/SECRET_KEY (and SUPABASE_URL, or it is
 *   derived from the service-role key's `ref` claim).
 *
 * Usage:
 *   cd backend && DATABASE_URL="$(node scripts/db-url.mjs)" node scripts/migrate-storage.mjs
 *   cd backend && DATABASE_URL="$(node scripts/db-url.mjs)" node scripts/migrate-storage.mjs --execute
 */
import { PrismaClient } from '@prisma/client';
import { Client as MinioClient } from 'minio';

const EXECUTE = process.argv.includes('--execute');

function deriveSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const payload = JSON.parse(
    Buffer.from(key.split('.')[1], 'base64').toString('utf8'),
  );
  if (!payload.ref) throw new Error('Cannot derive project ref from service-role key');
  return `https://${payload.ref}.supabase.co`;
}

function minioClient() {
  return new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    region: process.env.MINIO_REGION ?? 'us-east-1',
  });
}

async function enumerate(prisma) {
  // Read-only: list every object Supabase knows about.
  const rows = await prisma.$queryRawUnsafe(
    `SELECT bucket_id,
            name,
            (metadata->>'size')::bigint   AS size,
            (metadata->>'mimetype')       AS mime,
            updated_at
       FROM storage.objects
      ORDER BY bucket_id, name`,
  );
  return rows.map((r) => ({
    bucket: r.bucket_id,
    key: r.name,
    size: r.size == null ? null : Number(r.size),
    mime: r.mime,
    modifiedAt: r.updated_at,
  }));
}

function report(objects) {
  const byBucket = {};
  for (const o of objects) {
    const b = (byBucket[o.bucket] ??= { count: 0, bytes: 0 });
    b.count += 1;
    b.bytes += o.size ?? 0;
  }
  const fmt = (n) => `${(n / (1024 * 1024)).toFixed(2)} MB`;
  console.log('\n=== Supabase Storage reconciliation report (READ-ONLY) ===');
  let totalCount = 0;
  let totalBytes = 0;
  for (const [bucket, s] of Object.entries(byBucket).sort()) {
    console.log(
      `  ${bucket.padEnd(24)} ${String(s.count).padStart(6)} objects   ${fmt(s.bytes)}`,
    );
    totalCount += s.count;
    totalBytes += s.bytes;
  }
  console.log(`  ${'-'.repeat(24)} ${'------'} `);
  console.log(
    `  ${'TOTAL'.padEnd(24)} ${String(totalCount).padStart(6)} objects   ${fmt(totalBytes)}`,
  );
  console.log('No files were moved, modified, or deleted.\n');
}

async function upsertMap(prisma, o, fields) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.app_storage_migration_map
       (bucket_id, object_key, source_size, source_mime, source_modified_at, dest_size, dest_etag, status, error, migrated_at, verified_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     ON CONFLICT (bucket_id, object_key) DO UPDATE SET
       source_size = EXCLUDED.source_size,
       source_mime = EXCLUDED.source_mime,
       source_modified_at = EXCLUDED.source_modified_at,
       dest_size = EXCLUDED.dest_size,
       dest_etag = EXCLUDED.dest_etag,
       status = EXCLUDED.status,
       error = EXCLUDED.error,
       migrated_at = EXCLUDED.migrated_at,
       verified_at = EXCLUDED.verified_at,
       updated_at = now()`,
    o.bucket,
    o.key,
    o.size,
    o.mime,
    o.modifiedAt ?? null,
    fields.destSize ?? null,
    fields.destEtag ?? null,
    fields.status,
    fields.error ?? null,
    fields.migratedAt ?? null,
    fields.verifiedAt ?? null,
  );
}

async function alreadyVerified(prisma, o) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT status FROM public.app_storage_migration_map
      WHERE bucket_id=$1 AND object_key=$2`,
    o.bucket,
    o.key,
  );
  return rows[0]?.status === 'verified';
}

async function execute(prisma, objects) {
  const supabaseUrl = deriveSupabaseUrl();
  const minio = minioClient();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const o of objects) {
    if (await alreadyVerified(prisma, o)) {
      skipped += 1;
      continue;
    }
    try {
      const url = `${supabaseUrl}/storage/v1/object/${o.bucket}/${o.key
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = o.mime ?? 'application/octet-stream';
      await minio.putObject(o.bucket, o.key, buf, buf.length, {
        'Content-Type': mime,
      });
      const stat = await minio.statObject(o.bucket, o.key);
      const verified = o.size == null || stat.size === o.size;
      await upsertMap(prisma, o, {
        destSize: stat.size,
        destEtag: stat.etag,
        status: verified ? 'verified' : 'failed',
        error: verified ? null : `size mismatch src=${o.size} dest=${stat.size}`,
        migratedAt: new Date(),
        verifiedAt: verified ? new Date() : null,
      });
      verified ? (ok += 1) : (failed += 1);
      console.log(`  ${verified ? 'OK ' : 'ERR'} ${o.bucket}/${o.key}`);
    } catch (err) {
      failed += 1;
      await upsertMap(prisma, o, { status: 'failed', error: String(err) });
      console.log(`  ERR ${o.bucket}/${o.key} -> ${String(err)}`);
    }
  }
  console.log(
    `\n=== Migration complete: ${ok} verified, ${failed} failed, ${skipped} skipped ===\n`,
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const objects = await enumerate(prisma);
    report(objects);
    if (EXECUTE) {
      console.log('Running in --execute mode: copying objects to MinIO...');
      await execute(prisma, objects);
    } else {
      console.log('Report-only mode. Re-run with --execute to migrate.\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
