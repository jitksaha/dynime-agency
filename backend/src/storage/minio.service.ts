import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { BUCKET_POLICIES } from './storage.constants';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Thin wrapper around the MinIO (S3-compatible) client. Owns the connection and
 * bootstraps the bucket structure on startup. All higher-level rules
 * (validation, authorization, auditing) live in StorageService.
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  readonly client: MinioClient;
  private readonly region: string;
  private readonly publicUrl: string;
  private isFallback = false;
  private readonly fallbackDir = path.join(process.cwd(), 'storage-fallback');

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('storage.region') ?? 'us-east-1';
    this.publicUrl =
      this.config.get<string>('storage.publicUrl') ?? 'http://localhost:9000';
    this.client = new MinioClient({
      endPoint: this.config.get<string>('storage.endpoint') ?? 'localhost',
      port: this.config.get<number>('storage.port') ?? 9000,
      useSSL: this.config.get<boolean>('storage.useSSL') ?? false,
      accessKey: this.config.get<string>('storage.accessKey') ?? 'minioadmin',
      secretKey: this.config.get<string>('storage.secretKey') ?? 'minioadmin',
      region: this.region,
    });

    if (!fs.existsSync(this.fallbackDir)) {
      fs.mkdirSync(this.fallbackDir, { recursive: true });
    }
  }

  async onModuleInit() {
    // Bootstrap is best-effort: if MinIO is unreachable at boot the rest of the
    // app must still start (strangler-fig). Storage endpoints then surface the
    // error per-request.
    try {
      await this.ensureBuckets();
    } catch (err) {
      this.isFallback = true;
      this.logger.warn(
        `MinIO connection failed. Switching to Local Filesystem Fallback: ${String(err)}`,
      );
    }
  }

  /** Create every configured bucket if missing and apply public-read where needed. */
  async ensureBuckets(): Promise<void> {
    for (const [name, policy] of Object.entries(BUCKET_POLICIES)) {
      const exists = await this.client.bucketExists(name).catch(() => false);
      if (!exists) {
        await this.client.makeBucket(name, this.region);
        this.logger.log(`Created bucket: ${name}`);
      }
      if (policy.visibility === 'public') {
        await this.client.setBucketPolicy(
          name,
          JSON.stringify(this.publicReadPolicy(name)),
        );
      }
    }
  }

  private publicReadPolicy(bucket: string) {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };
  }

  publicObjectUrl(bucket: string, key: string): string {
    if (this.isFallback) {
      return `/api/v1/storage-fallback/${bucket}/${encodeURI(key)}`;
    }
    const base = this.publicUrl.replace(/\/+$/, '');
    return `${base}/${bucket}/${encodeURI(key)}`;
  }

  async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    size: number,
    mime: string,
  ) {
    if (this.isFallback) {
      const bucketDir = path.join(this.fallbackDir, bucket);
      if (!fs.existsSync(bucketDir)) {
        fs.mkdirSync(bucketDir, { recursive: true });
      }
      const filePath = path.join(bucketDir, key);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, body);
      return { etag: `local-${Date.now()}` };
    }
    return this.client.putObject(bucket, key, body, size, {
      'Content-Type': mime,
    });
  }

  async getObject(bucket: string, key: string) {
    if (this.isFallback) {
      const filePath = path.join(this.fallbackDir, bucket, key);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Object not found');
      }
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fs.readFileSync(filePath));
      return bufferStream;
    }
    return this.client.getObject(bucket, key);
  }

  async statObject(bucket: string, key: string) {
    if (this.isFallback) {
      const filePath = path.join(this.fallbackDir, bucket, key);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Object not found');
      }
      const stat = fs.statSync(filePath);
      return {
        size: stat.size,
        lastModified: stat.mtime,
        metaData: {},
        etag: `local-${stat.mtimeMs}`,
      };
    }
    return this.client.statObject(bucket, key);
  }

  async presignedGetUrl(bucket: string, key: string, ttlSec: number) {
    if (this.isFallback) {
      return `/api/v1/storage-fallback/${bucket}/${encodeURI(key)}`;
    }
    return this.client.presignedGetObject(bucket, key, ttlSec);
  }

  async removeObject(bucket: string, key: string) {
    if (this.isFallback) {
      const filePath = path.join(this.fallbackDir, bucket, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    }
    return this.client.removeObject(bucket, key);
  }

  listObjects(bucket: string, prefix = '', recursive = true) {
    return new Promise<
      { name: string; size: number; lastModified?: Date; etag?: string }[]
    >((resolve, reject) => {
      const out: {
        name: string;
        size: number;
        lastModified?: Date;
        etag?: string;
      }[] = [];
      const stream = this.client.listObjectsV2(bucket, prefix, recursive);
      stream.on('data', (obj) => {
        if (obj.name) {
          out.push({
            name: obj.name,
            size: obj.size ?? 0,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
        }
      });
      stream.on('end', () => resolve(out));
      stream.on('error', reject);
    });
  }
}
