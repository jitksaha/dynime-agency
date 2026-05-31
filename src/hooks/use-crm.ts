import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "sonner";

export const useCrmPipelines = () =>
  useQuery({
    queryKey: ["crm-pipelines"],
    queryFn: async () => {
      const data = await apiGet<any[]>('/crm/pipelines');
      return (data || []).map((p: any) => ({
        ...p,
        stages: (p.stages || []).sort((a: any, b: any) => a.position - b.position),
      }));
    },
  });

export const useCrmLeads = (filters?: { status?: string; source?: string; q?: string }) =>
  useQuery({
    queryKey: ["crm-leads", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.source) params.set('source', filters.source);
      if (filters?.q) params.set('q', filters.q);
      const qs = params.toString();
      return (await apiGet<any[]>(`/crm/leads${qs ? '?' + qs : ''}`)) ?? [];
    },
  });

export const useCrmDeals = (pipelineId?: string) =>
  useQuery({
    queryKey: ["crm-deals", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () =>
      (await apiGet<any[]>(`/crm/deals?pipeline_id=${pipelineId}`)) ?? [],
  });

export const useCrmActivities = (filters?: { mine?: boolean; status?: string }) =>
  useQuery({
    queryKey: ["crm-activities", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.mine) params.set('mine', 'true');
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return (await apiGet<any[]>(`/crm/activities${qs ? '?' + qs : ''}`)) ?? [];
    },
  });

export const useUpsertLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...data } = payload;
        return apiPatch(`/crm/leads/${id}`, data);
      }
      return apiPost('/crm/leads', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Lead saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useMoveDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) =>
      apiPatch(`/crm/deals/${id}`, { stage_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });
};

export const useUpsertDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...data } = payload;
        return apiPatch(`/crm/deals/${id}`, data);
      }
      return apiPost('/crm/deals', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-deals"] });
      toast.success("Deal saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpsertActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...data } = payload;
        return apiPatch(`/crm/activities/${id}`, data);
      }
      return apiPost('/crm/activities', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
      toast.success("Activity saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useCrmCampaigns = () =>
  useQuery({
    queryKey: ["crm-campaigns"],
    queryFn: async () => (await apiGet<any[]>('/crm/campaigns')) ?? [],
  });

export const useCrmSegments = () =>
  useQuery({
    queryKey: ["crm-segments"],
    queryFn: async () => (await apiGet<any[]>('/crm/segments')) ?? [],
  });
