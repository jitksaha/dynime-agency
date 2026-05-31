import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { toast } from "sonner";

export const useAttendance = (employeeId?: string, from?: string, to?: string) =>
  useQuery({
    queryKey: ["attendance", employeeId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (employeeId) params.set('employee_id', employeeId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return (await apiGet<any[]>(`/hrm/attendance${qs ? '?' + qs : ''}`)) ?? [];
    },
  });

export const useClockInOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, action }: { employeeId: string; action: "in" | "out" }) =>
      apiPost('/hrm/attendance/clock', { employee_id: employeeId, action }),
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
    queryFn: async () => (await apiGet<any[]>('/hrm/leave-types')) ?? [],
  });

export const useLeaveRequests = (employeeId?: string) =>
  useQuery({
    queryKey: ["leave-requests", employeeId],
    queryFn: async () => {
      const qs = employeeId ? `?employee_id=${employeeId}` : '';
      return (await apiGet<any[]>(`/hrm/leave-requests${qs}`)) ?? [];
    },
  });

export const useSubmitLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => apiPost('/hrm/leave-requests', payload),
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
    mutationFn: async ({ id, status, note }: { id: string; status: "approved" | "rejected"; note?: string }) =>
      apiPatch(`/hrm/leave-requests/${id}`, { status, note }),
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
      const qs = employeeId ? `?employee_id=${employeeId}` : '';
      return (await apiGet<any[]>(`/hrm/kpi-goals${qs}`)) ?? [];
    },
  });

export const useAnnouncements = () =>
  useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await apiGet<any[]>('/hrm/announcements')) ?? [],
  });

export const useUpsertAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...data } = payload;
        return apiPatch(`/hrm/announcements/${id}`, data);
      }
      return apiPost('/hrm/announcements', payload);
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
    queryFn: async () => (await apiGet<any[]>('/hrm/employees?active=true')) ?? [],
  });
