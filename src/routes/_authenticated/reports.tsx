import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, RequireManager } from "@/components/app-shell";
import { ErrorRow } from "./dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — DMRJ Scheduling" },
      {
        name: "description",
        content:
          "Reports in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:title", content: "Reports — DMRJ Scheduling" },
      {
        property: "og:description",
        content: "Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: workspace } = useWorkspace();
  const currency = workspace?.business.currency || "USD";

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const q = useQuery({
    queryKey: ["reports", workspace?.business.id],
    enabled: !!workspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("status, price_cents, starts_at, service_id, staff_id")
        .eq("business_id", workspace!.business.id)
        .gte("starts_at", since.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  const revenue = rows
    .filter((r) => r.status === "completed" || r.status === "confirmed")
    .reduce((s, r) => s + r.price_cents, 0);
  const completed = rows.filter((r) => r.status === "completed").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const noShow = rows.filter((r) => r.status === "no_show").length;
  const avg = completed ? Math.round(revenue / Math.max(completed, 1)) : 0;

  return (
    <AppShell title="Reports" description="Last 90 days">
      {workspace ? (
        <RequireManager role={workspace.role}>
          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.isError ? (
            <ErrorRow onRetry={() => q.refetch()} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Appointments", value: String(rows.length) },
                { label: "Completed", value: String(completed) },
                { label: "Cancelled", value: String(cancelled) },
                { label: "No-shows", value: String(noShow) },
                { label: "Revenue", value: money(revenue, currency) },
              ].map((c) => (
                <div key={c.label} className="surface p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold">{c.value}</p>
                </div>
              ))}
              <div className="surface p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Average completed appointment value
                </p>
                <p className="mt-1.5 text-2xl font-semibold">{money(avg, currency)}</p>
              </div>
            </div>
          )}
        </RequireManager>
      ) : null}
    </AppShell>
  );
}
