import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BillingCycleToggle } from "@/components/billing-cycle-toggle";
import { PLAN_LIST, type PlanId } from "@/lib/plans";
import { getSelectedPlan, saveSelection, selectPlan, type BillingCycle } from "@/lib/checkout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — DMRJ Scheduling" },
      {
        name: "description",
        content:
          "Appointment scheduling software for salons, clinics, spas and practices. Starter $19, Professional $39 and Business $79 per month.",
      },
      { property: "og:title", content: "Pricing — DMRJ Scheduling" },
      {
        property: "og:description",
        content:
          "Starter $19, Professional $39 and Business $79 a month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [chosen, setChosen] = useState<PlanId | null>(null);

  useEffect(() => {
    const saved = getSelectedPlan();
    if (saved) {
      setCycle(saved.cycle);
      setChosen(saved.plan);
    }
  }, []);

  function changeCycle(next: BillingCycle) {
    setCycle(next);
    saveSelection(chosen, next);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="font-display text-xl font-semibold text-primary">
          DMRJ Scheduling
        </Link>
        <Button asChild size="sm">
          <Link to="/auth">Get started</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Pick the plan that fits your team.
        </p>

        <div className="mt-8">
          <BillingCycleToggle value={cycle} onChange={changeCycle} />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <div
              key={plan.id}
              className={cn("surface flex flex-col p-6", chosen === plan.id && "ring-2 ring-primary")}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-5 text-4xl font-semibold">
                ${plan.price}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6"
                variant={plan.id === "pro" ? "default" : "outline"}
                onClick={() => {
                  setChosen(plan.id);
                  selectPlan(plan.id, cycle);
                }}
              >
                {chosen === plan.id ? `${plan.name} selected` : `Choose ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Payment checkout is not available yet.</p>
      </main>
    </div>
  );
}
