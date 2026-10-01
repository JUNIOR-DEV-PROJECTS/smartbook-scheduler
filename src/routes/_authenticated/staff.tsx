import { createFileRoute } from "@tanstack/react-router";

import { AppShell, RequireManager } from "@/components/app-shell";
import { EmptyRow, ErrorRow } from "./dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useStaff, useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff — DMRJ Scheduling" },
      {
        name: "description",
        content:
          "Staff in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:title", content: "Staff — DMRJ Scheduling" },
      {
        property: "og:description",
        content: "Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { data: workspace } = useWorkspace();
  const q = useStaff(workspace?.business.id);

  return (
    <AppShell title="Staff" description="Your team">
      {workspace ? (
        <RequireManager role={workspace.role}>
          {q.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : q.isError ? (
            <ErrorRow onRetry={() => q.refetch()} />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyRow text="No team members yet." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {q.data!.map((s) => (
                <div key={s.id} className="surface p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate font-medium">{s.full_name}</p>
                    <Badge variant={s.is_active ? "secondary" : "outline"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {s.title ?? "Team member"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.email ?? ""}</p>
                </div>
              ))}
            </div>
          )}
        </RequireManager>
      ) : null}
    </AppShell>
  );
}
