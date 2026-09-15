import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, RequireManager } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, PLAN_LIST } from "@/lib/plans";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { data: workspace } = useWorkspace();
  const business = workspace?.business;
  const plan = business ? PLANS[business.plan] : undefined;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usage = useQuery({
    queryKey: ["usage", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const [bookings, staff] = await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business!.id)
          .gte("starts_at", monthStart.toISOString()),
        supabase
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business!.id)
          .eq("is_active", true),
      ]);
      return { bookings: bookings.count ?? 0, staff: staff.count ?? 0 };
    },
  });

  return (
    <AppShell title="Billing" description="Your plan and usage">
      {workspace && business && plan ? (
        <RequireManager role={workspace.role}>
          <div className="space-y-5">
            <div className="surface p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{plan.name} plan</h2>
                  <p className="text-sm text-muted-foreground">${plan.price} per month</p>
                </div>
                <Badge variant="secondary">{business.plan_status}</Badge>
              </div>
              {business.plan_status === "trialing" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Trial ends {new Date(business.trial_ends_at).toLocaleDateString()}.
                </p>
              ) : null}

              <div className="mt-5 space-y-4">
                <UsageBar
                  label="Bookings this month"
                  used={usage.data?.bookings ?? 0}
                  limit={plan.monthlyBookings}
                />
                <UsageBar
                  label="Active team members"
                  used={usage.data?.staff ?? 0}
                  limit={plan.staffSeats}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {PLAN_LIST.map((p) => (
                <div key={p.id} className="surface p-5">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-1 text-2xl font-semibold">${p.price}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {p.id === business.plan ? (
                    <Badge className="mt-4" variant="secondary">
                      Current plan
                    </Badge>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Card payments aren't switched on yet — ask us to upgrade you.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </RequireManager>
      ) : null}
    </AppShell>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <Progress value={pct} className="mt-2" />
      {pct >= 100 ? (
        <p className="mt-1 text-xs text-destructive">
          You've reached this plan's limit — upgrade to keep adding.
        </p>
      ) : null}
    </div>
  );
}
