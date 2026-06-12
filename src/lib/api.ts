/**
 * Dynime API Client
 * Replaces @db/db-js for all backend communication.
 * Uses Laravel Sanctum token-based auth stored in localStorage.
 */

import axios, { type AxiosInstance } from 'axios';

// ── Base API instance ────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
});

// ── Backward-compatible named helpers (used throughout the codebase) ──────────
// These match the old NestJS API client shape so no component imports need changing.
export const apiGet  = <T = unknown>(path: string, params?: Record<string, unknown>) =>
  api.get<T>(path, { params }).then((r) => r.data);
export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  api.post<T>(path, body).then((r) => r.data);
export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  api.patch<T>(path, body).then((r) => r.data);
export const apiDelete = <T = unknown>(path: string) =>
  api.delete<T>(path).then((r) => r.data);


// ── Auth Token Management ────────────────────────────────────────────────────

const TOKEN_KEY = 'dynime_admin_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  remove: (): void => localStorage.removeItem(TOKEN_KEY),
};

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.remove();
      const path = window.location.pathname;
      const isLoginRoute = ['/superadmin/login', '/account/login', '/employee/login', '/investor/login'].includes(path);
      if (!isLoginRoute) {
        if (path.startsWith('/superadmin') || path.startsWith('/admin')) {
          window.location.href = '/superadmin/login';
        } else if (path.startsWith('/employee')) {
          window.location.href = `/employee/login?next=${encodeURIComponent(path + window.location.search)}`;
        } else if (path.startsWith('/investor')) {
          window.location.href = `/investor/login?next=${encodeURIComponent(path + window.location.search)}`;
        } else if (path.startsWith('/account')) {
          window.location.href = `/account/login?next=${encodeURIComponent(path + window.location.search)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: AdminUser }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<AdminUser>('/auth/me'),
};

// ── Blog API ─────────────────────────────────────────────────────────────────

export const blogApi = {
  list: (params?: { category?: string; tag?: string; featured?: boolean; limit?: number }) =>
    api.get<BlogPost[]>('/blog-posts', { params }),

  categories: () => api.get<string[]>('/blog-posts/categories'),

  get: (slug: string) => api.get<BlogPost>(`/blog-posts/${slug}`),

  recordView: (id: number) => api.post(`/blog-posts/${id}/view`),

  // Admin
  adminList: () => api.get<BlogPost[]>('/admin/blog-posts'),
  adminGet: (id: number) => api.get<BlogPost>(`/admin/blog-posts/${id}`),
  create: (data: Partial<BlogPost>) => api.post<BlogPost>('/admin/blog-posts', data),
  update: (id: number, data: Partial<BlogPost>) => api.patch<BlogPost>(`/admin/blog-posts/${id}`, data),
  delete: (id: number) => api.delete(`/admin/blog-posts/${id}`),
};

// ── Careers API ──────────────────────────────────────────────────────────────

export const careerApi = {
  list: (params?: { department?: string }) => api.get<Career[]>('/careers', { params }),
  departments: () => api.get<string[]>('/careers/departments'),
  get: (slug: string) => api.get<Career>(`/careers/${slug}`),
  recordView: (slug: string) => api.post(`/careers/${slug}/view`),

  // Job Applications
  apply: (formData: FormData) =>
    api.post('/job-applications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Admin
  adminList: () => api.get<Career[]>('/admin/careers'),
  adminGet: (id: number) => api.get<Career>(`/admin/careers/${id}`),
  create: (data: Partial<Career>) => api.post<Career>('/admin/careers', data),
  update: (id: number, data: Partial<Career>) => api.patch<Career>(`/admin/careers/${id}`, data),
  delete: (id: number) => api.delete(`/admin/careers/${id}`),

  // Admin: Applications
  applications: (params?: { status?: string; career_id?: number }) =>
    api.get('/admin/job-applications', { params }),
  application: (id: number) => api.get(`/admin/job-applications/${id}`),
  updateApplication: (id: number, data: { status?: string; admin_notes?: string }) =>
    api.patch(`/admin/job-applications/${id}`, data),
  deleteApplication: (id: number) => api.delete(`/admin/job-applications/${id}`),
  resumeUrl: (id: number) => api.get<{ url: string; filename: string }>(`/admin/job-applications/${id}/resume`),
};

// ── Portfolio API ─────────────────────────────────────────────────────────────

export const portfolioApi = {
  list: (params?: { category?: string }) => api.get<PortfolioProject[]>('/portfolio', { params }),
  categories: () => api.get<string[]>('/portfolio/categories'),
  get: (slug: string) => api.get<PortfolioProject>(`/portfolio/${slug}`),

  // Admin
  adminList: () => api.get<PortfolioProject[]>('/admin/portfolio'),
  create: (data: Partial<PortfolioProject>) => api.post<PortfolioProject>('/admin/portfolio', data),
  update: (id: number, data: Partial<PortfolioProject>) => api.patch<PortfolioProject>(`/admin/portfolio/${id}`, data),
  delete: (id: number) => api.delete(`/admin/portfolio/${id}`),
  bulkUpdate: (ids: number[], data: object) => api.post('/admin/portfolio/bulk-update', { ids, ...data }),
  bulkDelete: (ids: number[]) => api.post('/admin/portfolio/bulk-delete', { ids }),
};

// ── Team API ──────────────────────────────────────────────────────────────────

export const teamApi = {
  list: () => api.get<TeamMember[]>('/team'),

  // Admin
  adminList: () => api.get<TeamMember[]>('/admin/team'),
  create: (data: Partial<TeamMember>) => api.post<TeamMember>('/admin/team', data),
  update: (id: number, data: Partial<TeamMember>) => api.patch<TeamMember>(`/admin/team/${id}`, data),
  delete: (id: number) => api.delete(`/admin/team/${id}`),
};

// ── Services API ──────────────────────────────────────────────────────────────

export const serviceApi = {
  list: () => api.get<Service[]>('/services'),
  categories: () => api.get<string[]>('/services/categories'),
  get: (slug: string) => api.get<Service>(`/services/${slug}`),

  // Admin
  adminList: () => api.get<Service[]>('/admin/services'),
  create: (data: Partial<Service>) => api.post<Service>('/admin/services', data),
  update: (id: number, data: Partial<Service>) => api.patch<Service>(`/admin/services/${id}`, data),
  delete: (id: number) => api.delete(`/admin/services/${id}`),
};

// ── Contact API ───────────────────────────────────────────────────────────────

export const contactApi = {
  submit: (data: ContactFormData) => api.post('/contact', data),
  officeLocations: () => api.get<OfficeLocation[]>('/office-locations'),

  // Admin
  submissions: (params?: { status?: string; type?: string }) =>
    api.get('/admin/contact-submissions', { params }),
  submission: (id: number) => api.get(`/admin/contact-submissions/${id}`),
  updateSubmission: (id: number, data: object) => api.patch(`/admin/contact-submissions/${id}`, data),
  deleteSubmission: (id: number) => api.delete(`/admin/contact-submissions/${id}`),
};

// ── SEO API ───────────────────────────────────────────────────────────────────

export const seoApi = {
  getByPath: (path: string) => api.get<SeoMeta>('/seo', { params: { path } }),
  sitemap: () => api.get('/sitemap.xml', { responseType: 'text' }),

  // Admin
  list: () => api.get<SeoMeta[]>('/admin/seo'),
  upsert: (data: Partial<SeoMeta>) => api.post<SeoMeta>('/admin/seo', data),
  update: (id: number, data: Partial<SeoMeta>) => api.patch<SeoMeta>(`/admin/seo/${id}`, data),
  delete: (id: number) => api.delete(`/admin/seo/${id}`),
};

// ── Settings API ──────────────────────────────────────────────────────────────

export const settingsApi = {
  publicSettings: () => api.get<Record<string, unknown>>('/site-settings'),

  // Admin
  allSettings: () => api.get('/admin/site-settings'),
  upsert: (key: string, value: unknown, group?: string) =>
    api.post('/admin/site-settings', { key, value, group }),
  bulkUpsert: (settings: Array<{ key: string; value: unknown; group?: string }>) =>
    api.post('/admin/site-settings/bulk', { settings }),
  delete: (key: string) => api.delete(`/admin/site-settings/${key}`),
};

// ── Media API ─────────────────────────────────────────────────────────────────

export const mediaApi = {
  list: (params?: { folder?: string; type?: string }) =>
    api.get('/admin/media', { params }),
  folders: () => api.get<string[]>('/admin/media/folders'),
  upload: (file: File, folder?: string, altText?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    if (altText) formData.append('alt_text', altText);
    return api.post('/admin/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: number, data: { alt_text?: string }) => api.patch(`/admin/media/${id}`, data),
  delete: (id: number) => api.delete(`/admin/media/${id}`),
};

// ── Analytics API ─────────────────────────────────────────────────────────────

export const analyticsApi = {
  dashboard: () => api.get('/admin/analytics/dashboard'),
  pageviews: (days?: number) => api.get('/admin/analytics/pageviews', { params: { days } }),
  trackView: (path: string, entityType?: string, entityId?: number) =>
    api.post('/analytics/pageview', { path, entity_type: entityType, entity_id: entityId })
      .catch(() => {}), // Silent fail — don't break the page
};

// ── Backup API ────────────────────────────────────────────────────────────────

export const backupApi = {
  run: (type: 'db' | 'files' | 'full' = 'full') =>
    api.post('/admin/backup/run', { type }),
  list: () => api.get('/admin/backup/list'),
  download: (filename: string) =>
    `${import.meta.env.VITE_API_URL ?? '/api/v1'}/admin/backup/download/${encodeURIComponent(filename)}`,
  delete: (filename: string) => api.delete(`/admin/backup/${filename}`),
  clean: () => api.post('/admin/backup/clean'),
};

// ── TypeScript Types ──────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor' | 'manager';
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  category: string;
  tags: string[];
  author: string;
  read_minutes: number;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  view_count: number;
  published_at: string;
  meta_title?: string;
  meta_desc?: string;
  og_image?: string;
  created_at: string;
  updated_at: string;
}

export interface Career {
  id: number;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level?: string;
  salary_range?: string;
  description?: string;
  content_html?: string;
  responsibilities: string[];
  requirements: string[];
  hero_image_url?: string;
  vacancies: number;
  is_active: boolean;
  is_featured: boolean;
  view_count: number;
  posted_at: string;
  meta_title?: string;
  meta_desc?: string;
}

export interface PortfolioProject {
  id: number;
  title: string;
  slug?: string;
  category: string;
  description?: string;
  content_html?: string;
  cover_image_url?: string;
  gallery_images: string[];
  client_name?: string;
  project_url?: string;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  completed_at?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  department?: string;
  bio?: string;
  photo_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  email?: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface Service {
  id: number;
  slug: string;
  title: string;
  category?: string;
  excerpt?: string;
  description?: string;
  icon?: string;
  cover_image_url?: string;
  features: string[];
  pricing: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  meta_title?: string;
  meta_desc?: string;
}

export interface OfficeLocation {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  coordinates?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ContactFormData {
  type?: 'contact' | 'inquiry' | 'quote';
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  service?: string;
}

export interface SeoMeta {
  id: number;
  path: string;
  meta_title?: string;
  meta_desc?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_desc?: string;
  twitter_image?: string;
  canonical_url?: string;
  schema_json?: Record<string, unknown>;
  robots: string;
  is_active: boolean;
}
