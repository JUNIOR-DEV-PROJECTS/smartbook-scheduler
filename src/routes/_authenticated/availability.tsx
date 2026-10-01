import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, RequireManager } from "@/components/app-shell";
import { EmptyRow, ErrorRow } from "./dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS, timeLabel } from "@/lib/format";
import { useStaff, useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/availability")({
  head: () => ({ meta: [
    { title: "Availability — DMRJ Scheduling" },
    { name: "description", content: "Availability in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices." },
    { property: "og:title", content: "Availability — DMRJ Scheduling" },
    { property: "og:description", content: "Appointment scheduling software for salons, clinics, spas and practices." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const { data: workspace } = useWorkspace();
  const { data: staffList } = useStaff(workspace?.business.id);

  const q = useQuery({
    queryKey: ["availability", workspace?.business.id],
    enabled: !!workspace,
    queryFn: async () => {
      const [hours, shifts] = await Promise.all([
        supabase
          .from("business_hours")
          .select("*")
          .eq("business_id", workspace!.business.id)
          .order("weekday"),
        supabase
          .from("staff_availability")
          .select("*")
          .eq("business_id", workspace!.business.id)
          .order("weekday"),
      ]);
      if (hours.error) throw hours.error;
      if (shifts.error) throw shifts.error;
      return { hours: hours.data ?? [], shifts: shifts.data ?? [] };
    },
  });

  return (
    <AppShell title="Availability" description="Opening hours and staff shifts">
      {workspace ? (
        <RequireManager role={workspace.role}>
          {q.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : q.isError ? (
            <ErrorRow onRetry={() => q.refetch()} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="surface p-5">
                <h2 className="text-base font-semibold">Opening hours</h2>
                <div className="mt-3 space-y-1.5">
                  {q.data!.hours.length === 0 ? (
                    <EmptyRow text="No opening hours set." />
                  ) : (
                    q.data!.hours.map((h) => (
                      <div key={h.id} className="flex justify-between text-sm">
                        <span>{WEEKDAYS[h.weekday]}</span>
                        <span className="text-muted-foreground">
                          {h.is_closed
                            ? "Closed"
                            : `${timeLabel(h.open_time)} – ${timeLabel(h.close_time)}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="surface p-5">
                <h2 className="text-base font-semibold">Staff shifts</h2>
                <div className="mt-3 space-y-3">
                  {(staffList ?? []).length === 0 ? (
                    <EmptyRow text="No team members yet." />
                  ) : (
                    (staffList ?? []).map((s) => {
                      const shifts = q.data!.shifts.filter((x) => x.staff_id === s.id);
                      return (
                        <div key={s.id}>
                          <p className="text-sm font-medium">{s.full_name}</p>
                          {shifts.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No shifts set.</p>
                          ) : (
                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                              {shifts.map((x) => (
                                <li key={x.id}>
                                  {WEEKDAYS[x.weekday]}: {timeLabel(x.start_time)} –{" "}
                                  {timeLabel(x.end_time)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </RequireManager>
      ) : null}
    </AppShell>
  );
}
