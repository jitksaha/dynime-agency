/**
 * Storage Migration Script
 * Copies all files from Supabase Storage → MinIO.
 *
 * Usage:
 *   cd backend
 *   SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=https://xxx.supabase.co \
 *   MINIO_ENDPOINT=localhost MINIO_PORT=9000 MINIO_ACCESS_KEY=... MINIO_SECRET_KEY=... \
 *   npx ts-node scripts/migrate-storage.ts
 *
 * By default it copies all public buckets. Pass bucket names as CLI args to filter:
 *   npx ts-node scripts/migrate-storage.ts avatars hr-request-attachments
 */
import { Client as MinioClient } from 'minio';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT ?? '9000', 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin';

async function supabaseGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1${path}`, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
  });
  if (!res.ok) throw new Error(`Supabase Storage ${path}: ${res.status} ${res.statusText}`);
  return res;
}

async function listBuckets(): Promise<{ id: string; name: string }[]> {
  const res = await supabaseGet('/bucket');
  return res.json();
}

async function listObjects(bucket: string, prefix = ''): Promise<any[]> {
  const body = { prefix, limit: 1000, offset: 0 };
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`list ${bucket}/${prefix}: ${res.status}`);
  const items: any[] = await res.json();
  const files: any[] = [];
  for (const item of items) {
    if (item.id && !item.name.endsWith('/')) {
      files.push({ ...item, path: prefix ? `${prefix}/${item.name}` : item.name });
    } else if (!item.id) {
      // folder — recurse
      const sub = await listObjects(bucket, prefix ? `${prefix}/${item.name}` : item.name);
      files.push(...sub);
    }
  }
  return files;
}

async function downloadFile(bucket: string, path: string): Promise<Buffer> {
  const res = await supabaseGet(`/object/${bucket}/${path}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ensureBucket(minio: MinioClient, name: string) {
  const exists = await minio.bucketExists(name);
  if (!exists) {
    await minio.makeBucket(name);
    console.log(`  ✓ Created MinIO bucket: ${name}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const minio = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  const filterBuckets = process.argv.slice(2);
  const allBuckets = await listBuckets();
  const buckets = filterBuckets.length
    ? allBuckets.filter((b) => filterBuckets.includes(b.name))
    : allBuckets;

  console.log(`Migrating ${buckets.length} bucket(s): ${buckets.map((b) => b.name).join(', ')}`);

  let totalFiles = 0;
  let totalBytes = 0;
  let errors = 0;

  for (const bucket of buckets) {
    console.log(`\n── Bucket: ${bucket.name} ──`);
    await ensureBucket(minio, bucket.name);

    let objects: any[];
    try {
      objects = await listObjects(bucket.name);
    } catch (e: any) {
      console.error(`  ✗ Failed to list: ${e.message}`);
      errors++;
      continue;
    }

    console.log(`  Found ${objects.length} file(s)`);

    for (const obj of objects) {
      const path: string = obj.path ?? obj.name;
      try {
        const buf = await downloadFile(bucket.name, path);
        const contentType = obj.metadata?.mimetype ?? 'application/octet-stream';
        await minio.putObject(bucket.name, path, buf, buf.length, { 'Content-Type': contentType });
        totalFiles++;
        totalBytes += buf.length;

        // Write mapping record (for audit) using migration map table if available
        console.log(`  ✓ ${path} (${(buf.length / 1024).toFixed(1)} KB)`);
      } catch (e: any) {
        console.error(`  ✗ ${path}: ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\n══ Migration complete ══`);
  console.log(`  Files: ${totalFiles}`);
  console.log(`  Total: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  if (errors) console.warn(`  Errors: ${errors}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
