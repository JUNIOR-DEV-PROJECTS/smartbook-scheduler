import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AppointmentDialog } from "@/components/appointment-dialog";
import { AppointmentRowItem, EmptyRow, ErrorRow } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  useWorkspace,
  type AppointmentRow,
  type AppointmentStatus,
} from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { data: workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AppointmentStatus>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);

  const q = useQuery({
    queryKey: ["appointments", "all", workspace?.business.id],
    enabled: !!workspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "*, service:services(name, color, duration_minutes), staff:staff(full_name, color), customer:customers(full_name, email, phone)",
        )
        .eq("business_id", workspace!.business.id)
        .order("starts_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentRow[];
    },
  });

  async function updateStatus(id: string, next: AppointmentStatus) {
    const { error } = await supabase.from("appointments").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success("Appointment updated.");
  }

  const rows = (q.data ?? []).filter((a) => {
    const matches = status === "all" || a.status === status;
    const hay = `${a.customer?.full_name ?? ""} ${a.service?.name ?? ""} ${
      a.staff?.full_name ?? ""
    }`.toLowerCase();
    return matches && hay.includes(query.toLowerCase());
  });

  return (
    <AppShell
      title="Appointments"
      description="Everything booked, past and future"
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <CalendarPlus className="mr-1.5 h-4 w-4" /> New
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search customer, service or team member"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as never)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No-show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {q.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : q.isError ? (
            <ErrorRow onRetry={() => q.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyRow text="No appointments match your search." />
          ) : (
            rows.map((a) => (
              <AppointmentRowItem
                key={a.id}
                a={a}
                tz={workspace!.business.timezone || "UTC"}
                currency={workspace!.business.currency || "USD"}
                showDate
                onEdit={(row) => {
                  setEditing(row);
                  setOpen(true);
                }}
                onStatus={updateStatus}
              />
            ))
          )}
        </div>
      </div>

      {workspace ? (
        <AppointmentDialog
          business={workspace.business}
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
          appointment={editing}
        />
      ) : null}
    </AppShell>
  );
}
