import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readCachedSiteSettings, writeCachedSiteSettings } from "@/lib/site-settings-cache";
import { apiGet } from "@/lib/api";

export const useContactInfo = () => {
  return useQuery({
    queryKey: ["contact-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_info")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
};

export const useAllContactInfo = () => {
  return useQuery({
    queryKey: ["contact-info-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_info")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    initialData: readCachedSiteSettings,
    queryFn: async () => {
      const data = await apiGet<any[]>("/cms/site-settings");
      const map: Record<string, string> = {};
      data?.forEach((s) => {
        // Unwrap JSON value — could be a raw string, quoted string, or nested JSON
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

export const useFormTemplates = () => {
  return useQuery({
    queryKey: ["form-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("form_templates").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
};

export const useFormTemplate = (slug: string) => {
  return useQuery({
    queryKey: ["form-template", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
  });
};

export const useFormSubmissions = (formId?: string) => {
  return useQuery({
    queryKey: ["form-submissions", formId],
    queryFn: async () => {
      let query = supabase.from("form_submissions").select("*, form_templates(name)").order("created_at", { ascending: false });
      if (formId) query = query.eq("form_id", formId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useChatSessions = () => {
  return useQuery({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("session_id, sender_name, created_at, is_read, message")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Group by session
      const sessions: Record<string, { session_id: string; sender_name: string | null; last_message: string; last_time: string; unread: number }> = {};
      data?.forEach((msg) => {
        if (!msg.session_id) return;
        if (!sessions[msg.session_id]) {
          sessions[msg.session_id] = {
            session_id: msg.session_id,
            sender_name: msg.sender_name,
            last_message: msg.message,
            last_time: msg.created_at,
            unread: 0,
          };
        }
        if (!msg.is_read && msg.sender_name !== "Admin") sessions[msg.session_id].unread++;
      });
      return Object.values(sessions);
    },
  });
};

export const useChatMessages = (sessionId: string) => {
  return useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });
};

export const useSubmitForm = () => {
  return useMutation({
    mutationFn: async ({ formId, data }: { formId: string; data: Record<string, string> }) => {
      const { error } = await supabase.from("form_submissions").insert({ form_id: formId, data });
      if (error) throw error;
    },
  });
};

export const useSendChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { session_id: string; sender_type: string; sender_name?: string; message: string }) => {
      const { error } = await supabase.from("chat_messages").insert(msg);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["chat-messages", variables.session_id] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
};

export const usePortfolioProjects = (category?: string) => {
  return useQuery({
    queryKey: ["portfolio-projects", category],
    queryFn: async () => {
      let query = supabase
        .from("portfolio_projects")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("sort_order");
      if (category && category !== "All") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
