import { createFileRoute } from "@tanstack/react-router";

import { AppShell, RequireManager } from "@/components/app-shell";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/locations")({
  component: LocationsPage,
});

function LocationsPage() {
  const { data: workspace } = useWorkspace();
  const b = workspace?.business;

  return (
    <AppShell title="Locations" description="Where customers find you">
      {workspace && b ? (
        <RequireManager role={workspace.role}>
          <div className="surface max-w-xl p-5">
            <h2 className="text-base font-semibold">{b.name}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Address" value={b.address ?? "—"} />
              <Row label="City" value={b.city ?? "—"} />
              <Row label="Country" value={b.country ?? "—"} />
              <Row label="Time zone" value={b.timezone} />
              <Row label="Phone" value={b.phone ?? "—"} />
              <Row label="Booking page" value={`/book/${b.slug}`} />
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Extra locations arrive with multi-site support; edit these details in Settings.
            </p>
          </div>
        </RequireManager>
      ) : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
