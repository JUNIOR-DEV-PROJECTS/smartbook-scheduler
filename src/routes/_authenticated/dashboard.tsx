import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AppointmentDialog } from "@/components/appointment-dialog";
import { StatusBadge } from "@/components/status-badge";
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
import { money } from "@/lib/format";
import { fmtDateTime, fmtTime, dayRange } from "@/lib/tz";
import { toDateISO } from "@/lib/scheduling";
import {
  useAppointments,
  useWorkspace,
  type AppointmentRow,
  type AppointmentStatus,
} from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: workspace } = useWorkspace();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);

  return (
    <AppShell
      title="Dashboard"
      description={workspace ? `Today at ${workspace.business.name}` : undefined}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <CalendarPlus className="mr-1.5 h-4 w-4" /> New appointment
        </Button>
      }
    >
      {workspace ? (
        <>
          <DashboardBody
            onEdit={(a) => {
              setEditing(a);
              setDialogOpen(true);
            }}
          />
          <AppointmentDialog
            business={workspace.business}
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setEditing(null);
            }}
            appointment={editing}
          />
        </>
      ) : null}
    </AppShell>
  );
}

function DashboardBody({ onEdit }: { onEdit: (a: AppointmentRow) => void }) {
  const { data: workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const business = workspace!.business;
  const tz = business.timezone || "UTC";
  const currency = business.currency || "USD";

  const todayISO = toDateISO(new Date());
  const today = dayRange(todayISO);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");

  const todayQ = useAppointments(business.id, today.fromISO, today.toISO);

  const upcomingQ = useQuery({
    queryKey: ["appointments", "upcoming", business.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "*, service:services(name, color, duration_minutes), staff:staff(full_name, color), customer:customers(full_name, email, phone)",
        )
        .eq("business_id", business.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentRow[];
    },
  });

  const monthQ = useQuery({
    queryKey: ["appointments", "month-stats", business.id, monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, status, price_cents, starts_at, customer_id")
        .eq("business_id", business.id)
        .gte("starts_at", monthStart.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const newCustomersQ = useQuery({
    queryKey: ["customers", "new", business.id, monthStart.toISOString()],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gte("created_at", monthStart.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = useMemo(() => {
    const rows = monthQ.data ?? [];
    const todays = todayQ.data ?? [];
    const revenue = rows
      .filter((r) => r.status === "completed" || r.status === "confirmed")
      .reduce((sum, r) => sum + r.price_cents, 0);
    return {
      today: todays.filter((a) => a.status !== "cancelled").length,
      upcoming: (upcomingQ.data ?? []).filter((a) => ["pending", "confirmed"].includes(a.status))
        .length,
      completed: rows.filter((r) => r.status === "completed").length,
      cancelled: rows.filter((r) => r.status === "cancelled" || r.status === "no_show").length,
      revenue,
    };
  }, [monthQ.data, todayQ.data, upcomingQ.data]);

  async function setStatus(id: string, status: AppointmentStatus) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success("Appointment updated.");
  }

  const filteredUpcoming = (upcomingQ.data ?? []).filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const haystack = `${a.customer?.full_name ?? ""} ${a.service?.name ?? ""} ${
      a.staff?.full_name ?? ""
    }`.toLowerCase();
    return matchesStatus && haystack.includes(query.toLowerCase());
  });

  const cards = [
    { label: "Today's appointments", value: String(stats.today) },
    { label: "Upcoming", value: String(stats.upcoming) },
    { label: "Completed this month", value: String(stats.completed) },
    { label: "Cancelled / no-show", value: String(stats.cancelled) },
    { label: "New customers", value: String(newCustomersQ.data ?? 0) },
    { label: "Revenue booked", value: money(stats.revenue, currency) },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            {monthQ.isLoading || todayQ.isLoading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1.5 text-2xl font-semibold">{c.value}</p>
            )}
          </div>
        ))}
      </section>

      <section className="surface p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-base font-semibold">Today's schedule</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/calendar">Open calendar</Link>
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {todayQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : todayQ.isError ? (
            <ErrorRow onRetry={() => todayQ.refetch()} />
          ) : (todayQ.data ?? []).length === 0 ? (
            <EmptyRow text="Nothing booked today yet." />
          ) : (
            todayQ.data!.map((a) => (
              <AppointmentRowItem
                key={a.id}
                a={a}
                tz={tz}
                currency={currency}
                onEdit={onEdit}
                onStatus={setStatus}
              />
            ))
          )}
        </div>
      </section>

      <section className="surface p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <h2 className="truncate text-base font-semibold">Upcoming appointments</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 sm:w-56"
              placeholder="Search customer or service"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as never)}>
            <SelectTrigger className="sm:w-40">
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
        <div className="mt-4 space-y-2">
          {upcomingQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : upcomingQ.isError ? (
            <ErrorRow onRetry={() => upcomingQ.refetch()} />
          ) : filteredUpcoming.length === 0 ? (
            <EmptyRow text="No upcoming appointments match." />
          ) : (
            filteredUpcoming.map((a) => (
              <AppointmentRowItem
                key={a.id}
                a={a}
                tz={tz}
                currency={currency}
                showDate
                onEdit={onEdit}
                onStatus={setStatus}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function AppointmentRowItem({
  a,
  tz,
  currency,
  showDate,
  onEdit,
  onStatus,
}: {
  a: AppointmentRow;
  tz: string;
  currency: string;
  showDate?: boolean;
  onEdit: (a: AppointmentRow) => void;
  onStatus: (id: string, status: AppointmentStatus) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-9 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: a.service?.color ?? a.staff?.color ?? undefined }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {showDate ? fmtDateTime(a.starts_at, tz) : fmtTime(a.starts_at, tz)} ·{" "}
            {a.customer?.full_name ?? "Walk-in"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {a.service?.name ?? "Appointment"} with {a.staff?.full_name ?? "staff"} ·{" "}
            {money(a.price_cents, currency)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={a.status} />
        <Button size="sm" variant="ghost" onClick={() => onEdit(a)}>
          Edit
        </Button>
        {a.status !== "cancelled" ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onStatus(a.id, "cancelled")}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

export function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
      <p className="text-sm text-destructive">We couldn't load this list.</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
