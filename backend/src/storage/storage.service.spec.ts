import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { StorageService, UploadedFileLike } from './storage.service';
import { MinioService } from './minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user';

const admin: AuthUser = {
  id: 'admin-1',
  email: 'a@b.com',
  roles: ['super_admin'],
};
const plain: AuthUser = { id: 'user-1', email: 'u@b.com', roles: [] };

function file(over: Partial<UploadedFileLike> = {}): UploadedFileLike {
  return {
    originalname: 'x.png',
    mimetype: 'image/png',
    size: 1000,
    buffer: Buffer.from('x'),
    ...over,
  };
}

describe('StorageService', () => {
  let service: StorageService;
  let minio: jest.Mocked<Partial<MinioService>>;
  let auditCreate: jest.Mock;

  const auditEvents = () =>
    auditCreate.mock.calls.map((c) => c[0].data.event_type as string);

  beforeEach(async () => {
    minio = {
      putObject: jest.fn().mockResolvedValue({ etag: 'etag1' }),
      statObject: jest
        .fn()
        .mockResolvedValue({ size: 1000, etag: 'etag1', metaData: {} }),
      presignedGetUrl: jest.fn().mockResolvedValue('http://signed.example/x'),
      publicObjectUrl: jest
        .fn()
        .mockReturnValue('http://public.example/portfolio/x.png'),
      getObject: jest.fn(),
      listObjects: jest.fn().mockResolvedValue([]),
    };
    auditCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      app_storage_audit_log: { create: auditCreate },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: MinioService, useValue: minio },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(StorageService);
  });

  it('lists configured buckets with visibility', () => {
    const buckets = service.listBuckets();
    expect(buckets.find((b) => b.name === 'portfolio')?.visibility).toBe(
      'public',
    );
    expect(
      buckets.find((b) => b.name === 'company-documents')?.visibility,
    ).toBe('private');
  });

  it('rejects an unknown bucket', async () => {
    await expect(
      service.upload('nope', 'k.png', file(), admin),
    ).rejects.toBeInstanceOf(Error);
  });

  it('rejects path traversal in the key', async () => {
    await expect(
      service.upload('portfolio', '../etc/passwd', file(), admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('denies upload without write permission', async () => {
    await expect(
      service.upload('portfolio', 'logo.png', file(), plain),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects oversized files', async () => {
    await expect(
      service.upload(
        'portfolio',
        'logo.png',
        file({ size: 6 * 1024 * 1024 }),
        admin,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects disallowed mime types', async () => {
    await expect(
      service.upload(
        'portfolio',
        'logo.gifx',
        file({ mimetype: 'application/zip' }),
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads to a public bucket and returns a public URL', async () => {
    const res = await service.upload('portfolio', 'logo.png', file(), admin);
    expect(minio.putObject).toHaveBeenCalled();
    expect((res as { publicUrl?: string }).publicUrl).toContain(
      'public.example',
    );
  });

  it('grants the owner a signed URL on a private bucket', async () => {
    const key = `${plain.id}/agreement.pdf`;
    const res = await service.getSignedUrl('company-documents', key, plain);
    expect(res.url).toBe('http://signed.example/x');
    expect(res.expiresIn).toBe(300);
  });

  it('denies a non-owner without role on a private bucket', async () => {
    const key = `someone-else/agreement.pdf`;
    await expect(
      service.getSignedUrl('company-documents', key, plain),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records a stat audit event on success', async () => {
    const key = `${plain.id}/agreement.pdf`;
    await service.stat('company-documents', key, plain);
    expect(auditEvents()).toContain('stat');
  });

  it('records access_denied when stat is forbidden', async () => {
    await expect(
      service.stat('company-documents', 'someone-else/x.pdf', plain),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditEvents()).toContain('access_denied');
  });

  it('records access_denied when list is forbidden', async () => {
    await expect(
      service.list('company-documents', 'someone-else/', plain),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditEvents()).toContain('access_denied');
  });

  it('records validation_failed for a bad key on a read path', async () => {
    await expect(
      service.getSignedUrl('company-documents', '../escape', plain),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(auditEvents()).toContain('validation_failed');
  });
});
