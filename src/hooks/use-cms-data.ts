import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

// Thin wrappers so existing pages keep working
const apiGet = <T,>(path: string) => api.get<T>(path).then((r) => r.data);
const apiPost = <T,>(path: string, body?: unknown) => api.post<T>(path, body).then((r) => r.data);
const apiPatch = <T,>(path: string, body?: unknown) => api.patch<T>(path, body).then((r) => r.data);
const apiDelete = <T,>(path: string) => api.delete<T>(path).then((r) => r.data);

// ── Portfolio Projects ─────────────────────────────────────────────────
export const usePortfolioProjects = (category?: string) => {
  return useQuery({
    queryKey: ["portfolio-projects", category],
    queryFn: () => {
      const params = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
      return apiGet<any[]>(`/portfolio${params}`);
    },
  });
};

export const usePortfolioProjectsAdmin = () => {
  return useQuery({
    queryKey: ["portfolio-projects-admin"],
    queryFn: () => apiGet<any[]>("/admin/portfolio"),
  });
};

export const useUpsertPortfolioProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: any) => {
      if (project.id) return apiPatch<any>(`/admin/portfolio/${project.id}`, project);
      return apiPost<any>("/admin/portfolio", project);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects-admin"] });
    },
  });
};

export const useDeletePortfolioProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/admin/portfolio/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects-admin"] });
    },
  });
};

export const useBulkUpdatePortfolioProjects = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids: string[]; data: any }) =>
      apiPost<any>("/admin/portfolio/bulk-update", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects-admin"] });
    },
  });
};

export const useBulkDeletePortfolioProjects = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids: string[] }) =>
      apiPost<any>("/admin/portfolio/bulk-delete", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects-admin"] });
    },
  });
};

// ── Blog Posts ──────────────────────────────────────────────────────────
export const useBlogPosts = (category?: string, tag?: string, isFeatured?: boolean) => {
  return useQuery({
    queryKey: ["blog-posts", category, tag, isFeatured],
    queryFn: () => {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (tag) params.append("tag", tag);
      if (isFeatured !== undefined) params.append("featured", String(isFeatured));
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      return apiGet<any[]>(`/blog-posts${queryStr}`);
    },
  });
};

export const useBlogPostsAdmin = () => {
  return useQuery({
    queryKey: ["blog-posts-admin"],
    queryFn: () => apiGet<any[]>("/admin/blog-posts"),
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => apiGet<any>(`/blog-posts/${slug}`),
    enabled: !!slug,
  });
};

export const useBlogPostById = (id: string) => {
  return useQuery({
    queryKey: ["blog-post-id", id],
    queryFn: () => apiGet<any>(`/admin/blog-posts/${id}`),
    enabled: !!id,
  });
};

export const useUpsertBlogPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post: any) => {
      if (post.id) return apiPatch<any>(`/admin/blog-posts/${post.id}`, post);
      return apiPost<any>("/admin/blog-posts", post);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      qc.invalidateQueries({ queryKey: ["blog-post"] });
    },
  });
};

export const useDeleteBlogPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/admin/blog-posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
    },
  });
};

export const useIncrementBlogPostView = () => {
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/blog-posts/${id}/view`),
  });
};

// ── Careers ─────────────────────────────────────────────────────────────
export const useCareers = (department?: string) => {
  return useQuery({
    queryKey: ["careers", department],
    queryFn: () => {
      const queryStr = department ? `?department=${encodeURIComponent(department)}` : "";
      return apiGet<any[]>(`/careers${queryStr}`);
    },
  });
};

export const useCareersAdmin = () => {
  return useQuery({
    queryKey: ["careers-admin"],
    queryFn: () => apiGet<any[]>("/admin/careers"),
  });
};

export const useCareer = (slug: string) => {
  return useQuery({
    queryKey: ["career", slug],
    queryFn: () => apiGet<any>(`/careers/${slug}`),
    enabled: !!slug,
  });
};

export const useCareerById = (id: string) => {
  return useQuery({
    queryKey: ["career-id", id],
    queryFn: () => apiGet<any>(`/admin/careers/${id}`),
    enabled: !!id,
  });
};

export const useUpsertCareer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (career: any) => {
      if (career.id) return apiPatch<any>(`/admin/careers/${career.id}`, career);
      return apiPost<any>("/admin/careers", career);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["careers"] });
      qc.invalidateQueries({ queryKey: ["careers-admin"] });
      qc.invalidateQueries({ queryKey: ["career"] });
    },
  });
};

export const useDeleteCareer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/admin/careers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["careers"] });
      qc.invalidateQueries({ queryKey: ["careers-admin"] });
    },
  });
};

export const useCareerStats = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["career-stats", slug],
    queryFn: () => apiGet<{ view_count: number; applicant_count: number }>(`/careers/${slug}`),
    enabled: !!slug,
    refetchInterval: 60000,
  });
};

export const useIncrementCareerViewBySlug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiPost<any>(`/careers/${slug}/view`),
    onSuccess: (_, slug) => {
      qc.invalidateQueries({ queryKey: ["career-stats", slug] });
    },
  });
};

// ── Coupons (stub — not in Laravel v1) ─────────────────────────────────
export const useCoupons = () =>
  useQuery({ queryKey: ["coupons"], queryFn: () => Promise.resolve([] as any[]) });
export const useCouponsAdmin = () =>
  useQuery({ queryKey: ["coupons-admin"], queryFn: () => Promise.resolve([] as any[]) });
export const useCouponByCode = (_code: string) =>
  useQuery({ queryKey: ["coupon-code", _code], queryFn: () => Promise.resolve(null as any), enabled: false });
export const useUpsertCoupon = () =>
  useMutation({ mutationFn: (_c: any) => Promise.resolve({} as any) });
export const useDeleteCoupon = () =>
  useMutation({ mutationFn: (_id: string) => Promise.resolve({} as any) });

// ── Office Locations ────────────────────────────────────────────────────
export const useOfficeLocations = () => {
  return useQuery({
    queryKey: ["office-locations"],
    queryFn: () => apiGet<any[]>("/office-locations"),
  });
};

export const useUpsertOfficeLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loc: any) => {
      if (loc.id) return apiPatch<any>(`/admin/office-locations/${loc.id}`, loc);
      return apiPost<any>("/admin/office-locations", loc);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-locations"] });
    },
  });
};

export const useDeleteOfficeLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/admin/office-locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-locations"] });
    },
  });
};

// ── USA State Pricing ───────────────────────────────────────────────────
export const useUsaStatePricing = () => {
  return useQuery({
    queryKey: ["usa-state-pricing"],
    queryFn: () => apiGet<any[]>("/cms/usa-state-pricing"),
  });
};

export const useUsaStatePricingAdmin = () => {
  return useQuery({
    queryKey: ["usa-state-pricing-admin"],
    queryFn: () => apiGet<any[]>("/cms/usa-state-pricing/admin"),
  });
};

export const useUpsertUsaStatePricing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: any) => {
      if (row.id) return apiPatch<any>(`/cms/usa-state-pricing/${row.id}`, row);
      return apiPost<any>("/cms/usa-state-pricing", row);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usa-state-pricing"] });
      qc.invalidateQueries({ queryKey: ["usa-state-pricing-admin"] });
    },
  });
};

export const useDeleteUsaStatePricing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/cms/usa-state-pricing/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usa-state-pricing"] });
      qc.invalidateQueries({ queryKey: ["usa-state-pricing-admin"] });
    },
  });
};

// ── Country Eligibility ──────────────────────────────────────────────────
export const useCountryEligibility = () => {
  return useQuery({
    queryKey: ["country-eligibility"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("country_eligibility")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCountryEligibilityAdmin = () => {
  return useQuery({
    queryKey: ["country-eligibility-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("country_eligibility")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useUpsertCountryEligibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const payload = {
        name: row.name,
        aliases: row.aliases || [],
        status: row.status,
        category: row.category,
        reason: row.reason,
        is_active: row.is_active,
        sort_order: row.sort_order,
      };
      if (row.id) {
        const { data, error } = await supabase
          .from("country_eligibility")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("country_eligibility")
          .insert(payload);
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-eligibility"] });
      qc.invalidateQueries({ queryKey: ["country-eligibility-admin"] });
    },
  });
};

export const useDeleteCountryEligibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("country_eligibility")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-eligibility"] });
      qc.invalidateQueries({ queryKey: ["country-eligibility-admin"] });
    },
  });
};

// ── Site Settings ───────────────────────────────────────────────────────
export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const data = await apiGet<Record<string, unknown>>("/site-settings");
      const map: Record<string, string> = {};
      Object.entries(data ?? {}).forEach(([key, val]) => {
        map[key] = typeof val === "string" ? val : JSON.stringify(val ?? "");
      });
      return map;
    },
    staleTime: 60000,
  });
};

export const useUpsertSiteSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; value: any; group?: string }) =>
      apiPost<any>("/admin/site-settings", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
};
