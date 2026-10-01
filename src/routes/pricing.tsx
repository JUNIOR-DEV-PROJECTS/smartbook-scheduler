import { createFileRoute, Link } from "@tanstack/react-router";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_LIST } from "@/lib/plans";
import { selectPlan } from "@/lib/checkout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — DMRJ Scheduling scheduling plans" },
      {
        name: "description",
        content:
          "Appointment scheduling software for salons, clinics, spas and practices. Starter $19, Professional $39 and Business $79 per month.",
      },
      { property: "og:title", content: "Pricing — DMRJ Scheduling scheduling plans" },
      {
        property: "og:description",
        content:
          "Starter $19, Professional $39 and Business $79 a month. Two complimentary credits on sign-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {

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
          Every new account starts with 2 complimentary credits. After that, pick the plan that
          fits your team.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Monthly</span>
          <span className="text-muted-foreground" aria-disabled="true">Annual — Annual billing is coming soon.</span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <div key={plan.id} className="surface flex flex-col p-6">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-5 text-4xl font-semibold">
                ${plan.price}<span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6" variant={plan.id === "pro" ? "default" : "outline"} onClick={() => selectPlan(plan.id, "monthly")}>
                Choose {plan.name}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Payment checkout is not available yet.</p>
      </main>
    </div>
  );
}
