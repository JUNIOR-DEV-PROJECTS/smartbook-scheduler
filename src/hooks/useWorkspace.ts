import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Staff = Database["public"]["Tables"]["staff"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export interface Workspace {
  business: Business;
  role: AppRole;
  userId: string;
}

export function useSubscription(businessId?: string) {
  return useQuery({
    queryKey: ["subscription", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, billing_interval, status, current_period_end")
        .eq("business_id", businessId ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Current signed-in user's business + role. Null when they belong to none. */
export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    staleTime: 60_000,
    queryFn: async (): Promise<Workspace | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return null;

      const { data: memberships, error } = await supabase
        .from("business_members")
        .select("role, business_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const membership = memberships?.[0];
      if (!membership) return null;

      const { data: business, error: bErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", membership.business_id)
        .maybeSingle();
      if (bErr) throw bErr;
      if (!business) return null;

      return { business, role: membership.role, userId };
    },
  });
}

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  manager: "Admin",
  staff: "Staff",
};

export function canManage(role: AppRole | undefined) {
  return role === "owner" || role === "manager";
}

export function useServices(businessId?: string) {
  return useQuery({
    queryKey: ["services", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useStaff(businessId?: string) {
  return useQuery({
    queryKey: ["staff", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("business_id", businessId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomers(businessId?: string) {
  return useQuery({
    queryKey: ["customers", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

export interface AppointmentRow extends Appointment {
  service: { name: string; color: string; duration_minutes: number } | null;
  staff: { full_name: string; color: string } | null;
  customer: { full_name: string; email: string | null; phone: string | null } | null;
}

export function useAppointments(businessId: string | undefined, fromISO: string, toISO: string) {
  return useQuery({
    queryKey: ["appointments", businessId, fromISO, toISO],
    enabled: !!businessId,
    queryFn: async (): Promise<AppointmentRow[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "*, service:services(name, color, duration_minutes), staff:staff(full_name, color), customer:customers(full_name, email, phone)",
        )
        .eq("business_id", businessId!)
        .gte("starts_at", fromISO)
        .lt("starts_at", toISO)
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentRow[];
    },
  });
}
