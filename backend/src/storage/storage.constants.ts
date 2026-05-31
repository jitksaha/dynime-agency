import { ADMIN_ROLES } from '../auth/auth.constants';

const MB = 1024 * 1024;

// Role groupings used by bucket access rules. These mirror the intent of the
// existing Supabase Storage RLS policies. Fine-grained per-domain rules are
// applied as each domain module (KYC, HR, FlexPay, ...) is cut over; this
// foundation enforces visibility + owner/role/authenticated primitives.
export const ALL_ADMIN_ROLES = [...ADMIN_ROLES] as const;
export const HR_ADMIN_ROLES = ['super_admin', 'manager', 'hr'] as const;

const IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];
const IMAGE_HEIC_PDF_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];
const PDF_MIME = ['application/pdf'];
const DOC_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const DOC_IMG_MIME = [...DOC_MIME, ...IMAGE_MIME, 'application/octet-stream'];

/**
 * An access rule is satisfied if ANY of its enabled conditions match:
 *  - public:        anyone (no auth required)
 *  - authenticated: any signed-in user
 *  - roles:         user has at least one of these roles
 *  - owner:         the first path segment of the object key equals the user id
 */
export interface AccessRule {
  public?: boolean;
  authenticated?: boolean;
  roles?: readonly string[];
  owner?: boolean;
}

export interface BucketPolicy {
  /** public => anonymous GET allowed + served via public URL; private => signed URLs only */
  visibility: 'public' | 'private';
  read: AccessRule;
  write: AccessRule;
  /** null = any mime type allowed */
  allowedMime: readonly string[] | null;
  maxBytes: number;
  /** TTL for presigned GET URLs on private buckets (seconds) */
  signedUrlTtlSec: number;
}

// Bucket definitions mirror the live Supabase buckets 1:1 (same names).
export const BUCKET_POLICIES: Record<string, BucketPolicy> = {
  // ---- Public buckets (marketing / brand assets) ----
  portfolio: {
    visibility: 'public',
    read: { public: true },
    write: { roles: ALL_ADMIN_ROLES },
    allowedMime: IMAGE_MIME,
    maxBytes: 5 * MB,
    signedUrlTtlSec: 600,
  },
  'site-assets': {
    visibility: 'public',
    read: { public: true },
    write: { roles: ALL_ADMIN_ROLES },
    allowedMime: IMAGE_MIME,
    maxBytes: 10 * MB,
    signedUrlTtlSec: 600,
  },

  // ---- Private buckets (PII / sensitive business documents) ----
  'company-documents': {
    visibility: 'private',
    read: { owner: true, roles: ALL_ADMIN_ROLES },
    write: { owner: true, roles: ALL_ADMIN_ROLES },
    allowedMime: ['application/pdf', 'application/octet-stream'],
    maxBytes: 25 * MB,
    signedUrlTtlSec: 300,
  },
  'investor-documents': {
    visibility: 'private',
    read: { owner: true, roles: ALL_ADMIN_ROLES },
    write: { owner: true, roles: ALL_ADMIN_ROLES },
    allowedMime: PDF_MIME,
    maxBytes: 25 * MB,
    signedUrlTtlSec: 600,
  },
  'hr-documents': {
    visibility: 'private',
    read: { owner: true, roles: HR_ADMIN_ROLES },
    write: { roles: HR_ADMIN_ROLES },
    allowedMime: PDF_MIME,
    maxBytes: 25 * MB,
    signedUrlTtlSec: 86400,
  },
  'hr-request-attachments': {
    visibility: 'private',
    read: { owner: true, roles: HR_ADMIN_ROLES },
    write: { owner: true, roles: HR_ADMIN_ROLES },
    allowedMime: DOC_IMG_MIME,
    maxBytes: 25 * MB,
    signedUrlTtlSec: 600,
  },
  'flexpay-documents': {
    visibility: 'private',
    read: { owner: true, roles: ALL_ADMIN_ROLES },
    write: { owner: true, roles: ALL_ADMIN_ROLES },
    allowedMime: DOC_IMG_MIME,
    maxBytes: 25 * MB,
    signedUrlTtlSec: 300,
  },
  payslips: {
    visibility: 'private',
    read: { owner: true, roles: HR_ADMIN_ROLES },
    write: { roles: HR_ADMIN_ROLES },
    allowedMime: PDF_MIME,
    maxBytes: 25 * MB,
    signedUrlTtlSec: 86400,
  },
  'job-applications': {
    visibility: 'private',
    // Public-facing careers form uploads resumes; HR/admins read them.
    read: { roles: HR_ADMIN_ROLES },
    write: { authenticated: true },
    allowedMime: DOC_MIME,
    maxBytes: 10 * MB,
    signedUrlTtlSec: 1800,
  },
  'bank-receipts': {
    visibility: 'private',
    read: { owner: true, roles: ALL_ADMIN_ROLES },
    write: { owner: true, roles: ALL_ADMIN_ROLES },
    allowedMime: IMAGE_HEIC_PDF_MIME,
    maxBytes: 10 * MB,
    signedUrlTtlSec: 600,
  },
  'email-attachments': {
    visibility: 'private',
    read: { roles: ALL_ADMIN_ROLES },
    write: { roles: ALL_ADMIN_ROLES },
    allowedMime: null,
    maxBytes: 25 * MB,
    signedUrlTtlSec: 600,
  },
};

export const BUCKET_NAMES = Object.keys(BUCKET_POLICIES);

// Hard ceiling enforced by the upload interceptor BEFORE buffering, to prevent
// memory exhaustion from oversized multipart payloads. Equals the largest
// per-bucket limit; per-bucket limits are then enforced again in the service.
export const GLOBAL_MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(BUCKET_POLICIES).map((p) => p.maxBytes),
);
