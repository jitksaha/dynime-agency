import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAttendance = (employeeId?: string, from?: string, to?: string) =>
  useQuery({
    queryKey: ["attendance", employeeId, from, to],
    queryFn: async () => {
      let q = supabase.from("attendance_records").select("*").order("work_date", { ascending: false }).limit(500);
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (from) q = q.gte("work_date", from);
      if (to) q = q.lte("work_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useClockInOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, action }: { employeeId: string; action: "in" | "out" }) => {
      const _now = new Date();
      const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("work_date", today)
        .maybeSingle();
      if (action === "in") {
        if (existing?.clock_in) throw new Error("Already clocked in today");
        if (existing) {
          const { error } = await supabase.from("attendance_records").update({ clock_in: new Date().toISOString() }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("attendance_records").insert({
            employee_id: employeeId, work_date: today, clock_in: new Date().toISOString(), source: "self",
          });
          if (error) throw error;
        }
      } else {
        if (!existing?.clock_in) throw new Error("You haven't clocked in today");
        if (existing.clock_out) throw new Error("Already clocked out");
        const mins = Math.round((Date.now() - new Date(existing.clock_in).getTime()) / 60000);
        const { error } = await supabase
          .from("attendance_records")
          .update({ clock_out: new Date().toISOString(), total_minutes: mins })
          .eq("id", existing.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(vars.action === "in" ? "Clocked in" : "Clocked out");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useLeaveTypes = () =>
  useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_types").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

export const useLeaveRequests = (employeeId?: string) =>
  useQuery({
    queryKey: ["leave-requests", employeeId],
    queryFn: async () => {
      let q = supabase.from("leave_requests").select("*, leave_types(name,color)").order("created_at", { ascending: false }).limit(500);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useSubmitLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("leave_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDecideLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: "approved" | "rejected"; note?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("leave_requests").update({
        status, decision_note: note, decided_at: new Date().toISOString(), decided_by: u?.user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Decision saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useKpiGoals = (employeeId?: string) =>
  useQuery({
    queryKey: ["kpi-goals", employeeId],
    queryFn: async () => {
      let q = supabase.from("kpi_goals").select("*").order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useAnnouncements = () =>
  useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_published", true)
        .order("pinned", { ascending: false })
        .order("publish_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

export const useUpsertAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("announcements").insert({ ...payload, author_id: u?.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useEmployeeDirectory = () =>
  useQuery({
    queryKey: ["employee-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, designation, department, phone, photo_url, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });
