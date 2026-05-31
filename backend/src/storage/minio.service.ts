import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { BUCKET_POLICIES } from './storage.constants';

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
  }

  async onModuleInit() {
    // Bootstrap is best-effort: if MinIO is unreachable at boot the rest of the
    // app must still start (strangler-fig). Storage endpoints then surface the
    // error per-request.
    try {
      await this.ensureBuckets();
    } catch (err) {
      this.logger.warn(
        `Storage bootstrap skipped (MinIO unavailable?): ${String(err)}`,
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
    const base = this.publicUrl.replace(/\/+$/, '');
    return `${base}/${bucket}/${encodeURI(key)}`;
  }

  putObject(
    bucket: string,
    key: string,
    body: Buffer,
    size: number,
    mime: string,
  ) {
    return this.client.putObject(bucket, key, body, size, {
      'Content-Type': mime,
    });
  }

  getObject(bucket: string, key: string) {
    return this.client.getObject(bucket, key);
  }

  statObject(bucket: string, key: string) {
    return this.client.statObject(bucket, key);
  }

  presignedGetUrl(bucket: string, key: string, ttlSec: number) {
    return this.client.presignedGetObject(bucket, key, ttlSec);
  }

  removeObject(bucket: string, key: string) {
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
