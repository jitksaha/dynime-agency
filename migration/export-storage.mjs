#!/usr/bin/env node
/**
 * Export all Supabase Storage buckets and upload them into MinIO (S3-compatible).
 * READ ONLY against Supabase. Requires:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
 *
 * Run from the backend/ workspace so @supabase/supabase-js and minio resolve,
 * or `npm i @supabase/supabase-js minio` in this folder first.
 */
import { createClient } from '@supabase/supabase-js';
import { Client as MinioClient } from 'minio';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MINIO_ENDPOINT = 'localhost',
  MINIO_PORT = '9000',
  MINIO_USE_SSL = 'false',
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const minio = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: Number(MINIO_PORT),
  useSSL: MINIO_USE_SSL === 'true',
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

async function listAll(bucket, prefix = '') {
  const out = [];
  let page = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset: page * 1000 });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        out.push(...(await listAll(bucket, path))); // folder
      } else {
        out.push(path);
      }
    }
    if (data.length < 1000) break;
    page += 1;
  }
  return out;
}

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  console.log(`Found ${buckets.length} buckets:`, buckets.map((b) => b.name).join(', '));

  for (const bucket of buckets) {
    const exists = await minio.bucketExists(bucket.name).catch(() => false);
    if (!exists) await minio.makeBucket(bucket.name);

    const files = await listAll(bucket.name);
    console.log(`[${bucket.name}] ${files.length} objects`);
    for (const file of files) {
      const { data: blob, error: dErr } = await supabase.storage.from(bucket.name).download(file);
      if (dErr) {
        console.warn(`  ! failed ${file}: ${dErr.message}`);
        continue;
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      await minio.putObject(bucket.name, file, buf, buf.length, {
        'Content-Type': blob.type || 'application/octet-stream',
      });
    }
    console.log(`[${bucket.name}] ✅ migrated`);
  }
  console.log('Storage export complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
