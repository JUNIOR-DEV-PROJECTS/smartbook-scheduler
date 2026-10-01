import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyRow, ErrorRow } from "./dashboard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCustomers, useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — DMRJ Scheduling" },
      {
        name: "description",
        content:
          "Customers in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:title", content: "Customers — DMRJ Scheduling" },
      {
        property: "og:description",
        content: "Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data: workspace } = useWorkspace();
  const q = useCustomers(workspace?.business.id);
  const [query, setQuery] = useState("");

  const rows = (q.data ?? []).filter((c) =>
    `${c.full_name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title="Customers" description="Everyone who has booked with you">
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, email or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {q.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : q.isError ? (
          <ErrorRow onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyRow text="No customers yet — they're created automatically with the first booking." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <div key={c.id} className="surface p-4">
                <p className="truncate font-medium">{c.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.email ?? c.phone ?? "No contact details"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                  {c.no_show_count > 0 ? (
                    <Badge variant="outline" className="text-destructive">
                      {c.no_show_count} no-shows
                    </Badge>
                  ) : null}
                </div>
                {c.notes ? (
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{c.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
