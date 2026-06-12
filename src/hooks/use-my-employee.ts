import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/hooks/use-auth";

export type EmployeeRow = {
  id: string;
  full_name: string;
  email: string | null;
  employee_code: string | null;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  employment_type: string;
  work_location: string | null;
  status: string;
  currency: string;
  gross_salary: number;
  pay_cycle: string;
  phone: string | null;
  address: string | null;
  photo_url: string | null;
  reporting_to: string | null;
};

export const useMyEmployee = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-employee", user?.id, user?.email],
    enabled: !!user?.id,
    queryFn: async (): Promise<EmployeeRow | null> => {
      const { data, error } = await db
        .from("employees")
        .select("id, full_name, email, employee_code, designation, department, joining_date, employment_type, work_location, status, currency, gross_salary, pay_cycle, phone, address, photo_url, reporting_to")
        .or(`user_id.eq.${user!.id},email.ilike.${user!.email ?? ""}`)
        .order("user_id", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      // Auto-link user_id if it's not set yet but matched by email
      if (data && user?.id) {
        try {
          await db
            .from("employees")
            .update({ user_id: user.id })
            .eq("id", data.id)
            .is("user_id", null);
        } catch { /* RLS may forbid; ignore */ }
      }
      return data as EmployeeRow | null;
    },
  });
};
