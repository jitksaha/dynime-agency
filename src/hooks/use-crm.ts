import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCrmPipelines = () =>
  useQuery({
    queryKey: ["crm-pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("*, stages:crm_stages(*)")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
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
      let q = supabase.from("crm_leads").select("*").order("created_at", { ascending: false }).limit(500);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.source) q = q.eq("source", filters.source);
      if (filters?.q) q = q.or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,company.ilike.%${filters.q}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCrmDeals = (pipelineId?: string) =>
  useQuery({
    queryKey: ["crm-deals", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deals")
        .select("*")
        .eq("pipeline_id", pipelineId!)
        .order("position");
      if (error) throw error;
      return data || [];
    },
  });

export const useCrmActivities = (filters?: { mine?: boolean; status?: string }) =>
  useQuery({
    queryKey: ["crm-activities", filters],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      let q = supabase.from("crm_activities").select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(500);
      if (filters?.mine && userData?.user) q = q.eq("assignee_id", userData.user.id);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useUpsertLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("crm_leads").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_leads").insert(payload);
        if (error) throw error;
      }
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
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      const { error } = await supabase.from("crm_deals").update({ stage_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });
};

export const useUpsertDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("crm_deals").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_deals").insert(payload);
        if (error) throw error;
      }
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
        const { error } = await supabase.from("crm_activities").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_activities").insert(payload);
        if (error) throw error;
      }
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
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useCrmSegments = () =>
  useQuery({
    queryKey: ["crm-segments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_segments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
