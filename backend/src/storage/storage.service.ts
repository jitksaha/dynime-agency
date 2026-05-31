import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user';
import { RequestContext } from '../auth/token.service';
import { MinioService } from './minio.service';
import {
  AccessRule,
  BucketPolicy,
  BUCKET_POLICIES,
  BUCKET_NAMES,
} from './storage.constants';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  // --- public surface -------------------------------------------------------

  listBuckets() {
    return BUCKET_NAMES.map((name) => {
      const p = BUCKET_POLICIES[name];
      return {
        name,
        visibility: p.visibility,
        allowedMime: p.allowedMime,
        maxBytes: p.maxBytes,
        signedUrlTtlSec: p.signedUrlTtlSec,
      };
    });
  }

  async upload(
    bucket: string,
    key: string,
    file: UploadedFileLike | undefined,
    user: AuthUser,
    ctx?: RequestContext,
  ) {
    const policy = this.policyOrThrow(bucket);
    await this.validateKeyAudited('upload', bucket, key, user, ctx);
    if (!file) {
      throw new BadRequestException('No file provided (field name: "file")');
    }
    if (!this.canAccess(policy.write, user, key)) {
      await this.audit('access_denied', bucket, user, ctx, {
        key,
        action: 'upload',
      });
      throw new ForbiddenException('Not allowed to write to this bucket');
    }
    if (file.size > policy.maxBytes) {
      await this.audit('validation_failed', bucket, user, ctx, {
        key,
        reason: 'too_large',
        size: file.size,
        limit: policy.maxBytes,
      });
      throw new PayloadTooLargeException(
        `File exceeds the ${Math.round(policy.maxBytes / (1024 * 1024))}MB limit for this bucket`,
      );
    }
    if (
      policy.allowedMime &&
      !policy.allowedMime.includes(file.mimetype)
    ) {
      await this.audit('validation_failed', bucket, user, ctx, {
        key,
        reason: 'mime',
        mime: file.mimetype,
      });
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed for this bucket`,
      );
    }

    const result = await this.minio.putObject(
      bucket,
      key,
      file.buffer,
      file.size,
      file.mimetype,
    );

    await this.audit('upload', bucket, user, ctx, {
      key,
      size: file.size,
      mime: file.mimetype,
      etag: result.etag,
    });

    const base = {
      bucket,
      key,
      size: file.size,
      mimeType: file.mimetype,
      etag: result.etag,
    };
    if (policy.visibility === 'public') {
      return { ...base, publicUrl: this.minio.publicObjectUrl(bucket, key) };
    }
    return base;
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    user: AuthUser,
    ctx?: RequestContext,
  ) {
    const policy = this.policyOrThrow(bucket);
    await this.validateKeyAudited('signed_url', bucket, key, user, ctx);
    if (!this.canAccess(policy.read, user, key)) {
      await this.audit('access_denied', bucket, user, ctx, {
        key,
        action: 'signed_url',
      });
      throw new ForbiddenException('Not allowed to read from this bucket');
    }
    await this.statOrThrow(bucket, key);

    if (policy.visibility === 'public') {
      const url = this.minio.publicObjectUrl(bucket, key);
      await this.audit('public_url', bucket, user, ctx, { key });
      return { url, expiresIn: null as number | null };
    }

    const url = await this.minio.presignedGetUrl(
      bucket,
      key,
      policy.signedUrlTtlSec,
    );
    await this.audit('signed_url', bucket, user, ctx, {
      key,
      ttl: policy.signedUrlTtlSec,
    });
    return { url, expiresIn: policy.signedUrlTtlSec };
  }

  async stat(
    bucket: string,
    key: string,
    user: AuthUser,
    ctx?: RequestContext,
  ) {
    const policy = this.policyOrThrow(bucket);
    await this.validateKeyAudited('stat', bucket, key, user, ctx);
    if (!this.canAccess(policy.read, user, key)) {
      await this.audit('access_denied', bucket, user, ctx, {
        key,
        action: 'stat',
      });
      throw new ForbiddenException('Not allowed to read from this bucket');
    }
    const s = await this.statOrThrow(bucket, key);
    await this.audit('stat', bucket, user, ctx, { key, size: s.size });
    return {
      bucket,
      key,
      size: s.size,
      etag: s.etag,
      lastModified: s.lastModified,
      mimeType: s.metaData?.['content-type'] ?? null,
    };
  }

  async getObjectStream(
    bucket: string,
    key: string,
    user: AuthUser,
    ctx?: RequestContext,
  ) {
    const policy = this.policyOrThrow(bucket);
    await this.validateKeyAudited('download', bucket, key, user, ctx);
    if (!this.canAccess(policy.read, user, key)) {
      await this.audit('access_denied', bucket, user, ctx, {
        key,
        action: 'download',
      });
      throw new ForbiddenException('Not allowed to read from this bucket');
    }
    const stat = await this.statOrThrow(bucket, key);
    const stream = await this.minio.getObject(bucket, key);
    await this.audit('download', bucket, user, ctx, { key, size: stat.size });
    return { stream, stat };
  }

  async list(
    bucket: string,
    prefix: string,
    user: AuthUser,
    ctx?: RequestContext,
  ) {
    const policy = this.policyOrThrow(bucket);
    // Listing is restricted to admins/role-holders. Owners may list only their
    // own prefix.
    const isPrivileged =
      !!policy.read.public ||
      (!!policy.read.roles &&
        user.roles.some((r) => policy.read.roles!.includes(r)));
    if (!isPrivileged) {
      if (policy.read.owner && prefix.split('/')[0] === user.id) {
        // allowed: owner listing their own folder
      } else {
        await this.audit('access_denied', bucket, user, ctx, {
          prefix,
          action: 'list',
        });
        throw new ForbiddenException('Not allowed to list this bucket');
      }
    }
    const objects = await this.minio.listObjects(bucket, prefix, true);
    await this.audit('list', bucket, user, ctx, {
      prefix,
      count: objects.length,
    });
    return { bucket, prefix, objects };
  }

  // --- helpers --------------------------------------------------------------

  private policyOrThrow(bucket: string): BucketPolicy {
    const policy = BUCKET_POLICIES[bucket];
    if (!policy) {
      throw new NotFoundException(`Unknown bucket: ${bucket}`);
    }
    return policy;
  }

  private async statOrThrow(bucket: string, key: string) {
    try {
      return await this.minio.statObject(bucket, key);
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === 'NotFound' || e?.code === 'NoSuchKey') {
        throw new NotFoundException('Object not found');
      }
      throw err;
    }
  }

  /**
   * Validate a key and, on failure, record a `validation_failed` audit row
   * before rethrowing. Used by read/list/stat/upload paths so malformed-key
   * attempts are observable.
   */
  private async validateKeyAudited(
    action: string,
    bucket: string,
    key: string,
    user: AuthUser | undefined,
    ctx?: RequestContext,
  ): Promise<void> {
    try {
      this.validateKey(key);
    } catch (err) {
      await this.audit('validation_failed', bucket, user, ctx, {
        key,
        reason: 'key',
        action,
      });
      throw err;
    }
  }

  /** Reject empty keys, absolute paths, and traversal attempts. */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Object key is required');
    }
    if (key.startsWith('/') || key.includes('..') || key.includes('\\')) {
      throw new BadRequestException('Invalid object key');
    }
    if (key.length > 1024) {
      throw new BadRequestException('Object key is too long');
    }
  }

  private isOwner(user: AuthUser, key: string): boolean {
    return key.split('/')[0] === user.id;
  }

  private canAccess(
    rule: AccessRule,
    user: AuthUser | undefined,
    key: string,
  ): boolean {
    if (rule.public) return true;
    if (!user) return false;
    if (rule.roles && user.roles.some((r) => rule.roles!.includes(r))) {
      return true;
    }
    if (rule.owner && this.isOwner(user, key)) return true;
    if (rule.authenticated) return true;
    return false;
  }

  private async audit(
    event: string,
    bucket: string,
    user: AuthUser | undefined,
    ctx: RequestContext | undefined,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.app_storage_audit_log.create({
        data: {
          event_type: event,
          user_id: user?.id ?? null,
          bucket_id: bucket,
          object_key:
            typeof metadata.key === 'string' ? metadata.key : null,
          size_bytes:
            typeof metadata.size === 'number'
              ? BigInt(metadata.size)
              : null,
          mime_type:
            typeof metadata.mime === 'string' ? metadata.mime : null,
          ip_address: ctx?.ip ?? null,
          user_agent: ctx?.userAgent ?? null,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write storage audit log: ${String(err)}`);
    }
  }
}
