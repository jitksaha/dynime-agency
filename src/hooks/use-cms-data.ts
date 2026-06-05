import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { readCachedSiteSettings, writeCachedSiteSettings } from "@/lib/site-settings-cache";

// ── Portfolio Projects ─────────────────────────────────────────────────
export const usePortfolioProjects = (category?: string) => {
  return useQuery({
    queryKey: ["portfolio-projects", category],
    queryFn: () => {
      const queryStr = category && category !== "All" ? `?category=${category}` : "";
      return apiGet<any[]>(`/cms/portfolio-projects${queryStr}`);
    },
  });
};

export const usePortfolioProjectsAdmin = () => {
  return useQuery({
    queryKey: ["portfolio-projects-admin"],
    queryFn: () => apiGet<any[]>("/cms/portfolio-projects/admin"),
  });
};

export const useUpsertPortfolioProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: any) => {
      if (project.id) {
        return apiPatch<any>(`/cms/portfolio-projects/${project.id}`, project);
      }
      return apiPost<any>("/cms/portfolio-projects", project);
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
    mutationFn: (id: string) => apiDelete<any>(`/cms/portfolio-projects/${id}`),
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
      apiPost<any>("/cms/portfolio-projects/bulk-update", payload),
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
      apiPost<any>("/cms/portfolio-projects/bulk-delete", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects-admin"] });
    },
  });
};

// ── Blog Posts ─────────────────────────────────────────────────────────
export const useBlogPosts = (category?: string, tag?: string, isFeatured?: boolean) => {
  return useQuery({
    queryKey: ["blog-posts", category, tag, isFeatured],
    queryFn: () => {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (tag) params.append("tag", tag);
      if (isFeatured !== undefined) params.append("is_featured", String(isFeatured));
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      return apiGet<any[]>(`/cms/blog-posts${queryStr}`);
    },
  });
};

export const useBlogPostsAdmin = () => {
  return useQuery({
    queryKey: ["blog-posts-admin"],
    queryFn: () => apiGet<any[]>("/cms/blog-posts/admin"),
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => apiGet<any>(`/cms/blog-posts/slug/${slug}`),
    enabled: !!slug,
  });
};

export const useBlogPostById = (id: string) => {
  return useQuery({
    queryKey: ["blog-post-id", id],
    queryFn: () => apiGet<any>(`/cms/blog-posts/id/${id}`),
    enabled: !!id,
  });
};

export const useUpsertBlogPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post: any) => {
      if (post.id) {
        return apiPatch<any>(`/cms/blog-posts/${post.id}`, post);
      }
      return apiPost<any>("/cms/blog-posts", post);
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
    mutationFn: (id: string) => apiDelete<any>(`/cms/blog-posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
    },
  });
};

export const useIncrementBlogPostView = () => {
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/cms/blog-posts/${id}/view`),
  });
};

// ── Careers ────────────────────────────────────────────────────────────
export const useCareers = (department?: string) => {
  return useQuery({
    queryKey: ["careers", department],
    queryFn: () => {
      const queryStr = department ? `?department=${department}` : "";
      return apiGet<any[]>(`/cms/careers${queryStr}`);
    },
  });
};

export const useCareersAdmin = () => {
  return useQuery({
    queryKey: ["careers-admin"],
    queryFn: () => apiGet<any[]>("/cms/careers/admin"),
  });
};

export const useCareer = (slug: string) => {
  return useQuery({
    queryKey: ["career", slug],
    queryFn: () => apiGet<any>(`/cms/careers/slug/${slug}`),
    enabled: !!slug,
  });
};

export const useCareerById = (id: string) => {
  return useQuery({
    queryKey: ["career-id", id],
    queryFn: () => apiGet<any>(`/cms/careers/id/${id}`),
    enabled: !!id,
  });
};

export const useUpsertCareer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (career: any) => {
      if (career.id) {
        return apiPatch<any>(`/cms/careers/${career.id}`, career);
      }
      return apiPost<any>("/cms/careers", career);
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
    mutationFn: (id: string) => apiDelete<any>(`/cms/careers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["careers"] });
      qc.invalidateQueries({ queryKey: ["careers-admin"] });
    },
  });
};

export const useCareerStats = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["career-stats", slug],
    queryFn: () => apiGet<{ view_count: number; applicant_count: number }>(`/cms/careers/slug/${slug}/stats`),
    enabled: !!slug,
    refetchInterval: 30000,
  });
};

export const useIncrementCareerViewBySlug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiPost<any>(`/cms/careers/slug/${slug}/view`),
    onSuccess: (_, slug) => {
      qc.invalidateQueries({ queryKey: ["career-stats", slug] });
    },
  });
};

// ── Coupons ────────────────────────────────────────────────────────────
export const useCoupons = () => {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: () => apiGet<any[]>("/cms/coupons"),
  });
};

export const useCouponsAdmin = () => {
  return useQuery({
    queryKey: ["coupons-admin"],
    queryFn: () => apiGet<any[]>("/cms/coupons/admin"),
  });
};

export const useCouponByCode = (code: string) => {
  return useQuery({
    queryKey: ["coupon-code", code],
    queryFn: () => apiGet<any>(`/cms/coupons/code/${code}`),
    enabled: !!code,
  });
};

export const useUpsertCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (coupon: any) => {
      if (coupon.id) {
        return apiPatch<any>(`/cms/coupons/${coupon.id}`, coupon);
      }
      return apiPost<any>("/cms/coupons", coupon);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons-admin"] });
    },
  });
};

export const useDeleteCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/cms/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons-admin"] });
    },
  });
};

// ── Office Locations ───────────────────────────────────────────────────
export const useOfficeLocations = () => {
  return useQuery({
    queryKey: ["office-locations"],
    queryFn: () => apiGet<any[]>("/cms/office-locations"),
  });
};

export const useUpsertOfficeLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loc: any) => {
      if (loc.id) {
        return apiPatch<any>(`/cms/office-locations/${loc.id}`, loc);
      }
      return apiPost<any>("/cms/office-locations", loc);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-locations"] });
    },
  });
};

export const useDeleteOfficeLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/cms/office-locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-locations"] });
    },
  });
};

// ── USA State Pricing ──────────────────────────────────────────────────
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
    mutationFn: (item: any) => {
      if (item.id) {
        return apiPatch<any>(`/cms/usa-state-pricing/${item.id}`, item);
      }
      return apiPost<any>("/cms/usa-state-pricing", item);
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

// ── Country Eligibility ────────────────────────────────────────────────
export const useCountryEligibility = () => {
  return useQuery({
    queryKey: ["country-eligibility"],
    queryFn: () => apiGet<any[]>("/cms/country-eligibility"),
  });
};

export const useCountryEligibilityAdmin = () => {
  return useQuery({
    queryKey: ["country-eligibility-admin"],
    queryFn: () => apiGet<any[]>("/cms/country-eligibility/admin"),
  });
};

export const useUpsertCountryEligibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: any) => {
      if (item.id) {
        return apiPatch<any>(`/cms/country-eligibility/${item.id}`, item);
      }
      return apiPost<any>("/cms/country-eligibility", item);
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
    mutationFn: (id: string) => apiDelete<any>(`/cms/country-eligibility/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-eligibility"] });
      qc.invalidateQueries({ queryKey: ["country-eligibility-admin"] });
    },
  });
};

// ── Site Settings ──────────────────────────────────────────────────────
export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    initialData: readCachedSiteSettings,
    queryFn: async () => {
      const data = await apiGet<any[]>("/cms/site-settings");
      const map: Record<string, string> = {};
      data?.forEach((s) => {
        let val = s.value;
        while (typeof val === "string") {
          try { val = JSON.parse(val); } catch { break; }
        }
        map[s.key] = typeof val === "string" ? val : JSON.stringify(val);
      });
      writeCachedSiteSettings(map);
      return map;
    },
    staleTime: 5000,
  });
};

export const useUpsertSiteSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; value: any }) => apiPost<any>("/cms/site-settings", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
};

