import { createFileRoute } from "@tanstack/react-router";

import { AppShell, RequireManager } from "@/components/app-shell";
import { EmptyRow, ErrorRow } from "./dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { useServices, useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({ meta: [
    { title: "Services — DMRJ Scheduling" },
    { name: "description", content: "Services in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices." },
    { property: "og:title", content: "Services — DMRJ Scheduling" },
    { property: "og:description", content: "Appointment scheduling software for salons, clinics, spas and practices." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: workspace } = useWorkspace();
  const q = useServices(workspace?.business.id);
  const currency = workspace?.business.currency || "USD";

  return (
    <AppShell title="Services" description="What customers can book">
      {workspace ? (
        <RequireManager role={workspace.role}>
          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.isError ? (
            <ErrorRow onRetry={() => q.refetch()} />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyRow text="No services yet." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {q.data!.map((s) => (
                <div key={s.id} className="surface p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate font-medium">{s.name}</p>
                    <Badge variant={s.is_active ? "secondary" : "outline"}>
                      {s.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.duration_minutes} min · {money(s.price_cents, currency)}
                  </p>
                  {s.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </RequireManager>
      ) : null}
    </AppShell>
  );
}
