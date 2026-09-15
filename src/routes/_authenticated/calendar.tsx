import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AppointmentDialog } from "@/components/appointment-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments, useStaff, useWorkspace, type AppointmentRow } from "@/hooks/useWorkspace";
import { addDays, fmtTime, startOfMonth, startOfWeek } from "@/lib/tz";
import { toDateISO } from "@/lib/scheduling";
import { WEEKDAYS_SHORT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type View = "day" | "week" | "month";

function CalendarPage() {
  const { data: workspace } = useWorkspace();
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(() => new Date());
  const [staffFilter, setStaffFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);

  const { data: staffList } = useStaff(workspace?.business.id);

  const { start, days } = useMemo(() => {
    if (view === "day") {
      const d = new Date(cursor);
      d.setHours(0, 0, 0, 0);
      return { start: d, days: 1 };
    }
    if (view === "week") return { start: startOfWeek(cursor), days: 7 };
    const s = startOfMonth(cursor);
    const end = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    return { start: s, days: Math.round((end.getTime() - s.getTime()) / 86400000) };
  }, [view, cursor]);

  const q = useAppointments(
    workspace?.business.id,
    start.toISOString(),
    addDays(start, days).toISOString(),
  );

  if (!workspace) return <AppShell title="Calendar">{null}</AppShell>;
  const tz = workspace.business.timezone || "UTC";

  const rows = (q.data ?? []).filter(
    (a) => staffFilter === "all" || a.staff_id === staffFilter,
  );

  const byDay = new Map<string, AppointmentRow[]>();
  for (const a of rows) {
    const key = toDateISO(new Date(a.starts_at));
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  const label =
    view === "month"
      ? start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
        ? `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(
            start,
            6,
          ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : start.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

  function shift(dir: number) {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  }

  return (
    <AppShell
      title="Calendar"
      description={label}
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
        <div className="grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="sm:ml-auto sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team members</SelectItem>
              {(staffList ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {q.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div
            className={
              view === "day"
                ? "grid gap-3"
                : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
            }
          >
            {Array.from({ length: days }).map((_, i) => {
              const d = addDays(start, i);
              const key = toDateISO(d);
              const list = byDay.get(key) ?? [];
              return (
                <div key={key} className="surface p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {WEEKDAYS_SHORT[d.getDay()]} {d.getDate()}
                  </p>
                  <div className="mt-2 space-y-2">
                    {list.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setOpen(true);
                        }}
                        className="w-full rounded-lg border border-dashed border-border p-3 text-left text-xs text-muted-foreground hover:bg-secondary"
                      >
                        Free — add appointment
                      </button>
                    ) : (
                      list.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setEditing(a);
                            setOpen(true);
                          }}
                          className="w-full rounded-lg border border-border p-2.5 text-left hover:bg-secondary"
                          style={{ borderLeft: `4px solid ${a.service?.color ?? "#0f766e"}` }}
                        >
                          <p className="truncate text-sm font-medium">
                            {fmtTime(a.starts_at, tz)} {a.customer?.full_name ?? "Walk-in"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.service?.name} · {a.staff?.full_name}
                          </p>
                          <div className="mt-1.5">
                            <StatusBadge status={a.status} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AppointmentDialog
        business={workspace.business}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        appointment={editing}
        defaultDate={toDateISO(start)}
      />
    </AppShell>
  );
}
